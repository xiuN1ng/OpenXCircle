import JSZip from 'jszip';
import type { CircleData, RelationshipType, UserNode } from '../types';

interface RawTweetEntity {
  name: string;
  screen_name: string;
  id_str: string;
}

interface RawUrlEntity {
  expanded_url?: string;
  url?: string;
}

interface RawTweetBody {
  full_text?: string;
  in_reply_to_screen_name?: string;
  created_at?: string;
  quoted_status_id?: string;
  quoted_status_id_str?: string;
  quoted_status_permalink?: { expanded?: string; url?: string };
  entities?: {
    user_mentions?: RawTweetEntity[];
    urls?: RawUrlEntity[];
  };
}

interface RawTweet {
  tweet?: RawTweetBody;
}

interface ArchiveAccount {
  username?: string;
  accountDisplayName?: string;
}

interface InteractionBucket {
  handle: string;
  name: string;
  replies: number;
  quotes: number;
  retweets: number;
  mentions: number;
}

const TWEET_FILE = /(?:^|\/)(?:tweets|tweet)(?:-part\d+)?\.(?:js|json)$/i;
const ACCOUNT_FILE = /(?:^|\/)account\.js$/i;
const STATUS_URL = /(?:twitter\.com|x\.com)\/([A-Za-z0-9_]{1,15})\/status\/\d+/i;

function parseYtdPayload(content: string): unknown {
  let jsonText = content.replace(/^\uFEFF/, '').trim();
  if (jsonText.startsWith('window.YTD')) {
    const eq = jsonText.indexOf('=');
    if (eq === -1) {
      throw new Error('归档脚本缺少赋值内容');
    }
    jsonText = jsonText.slice(eq + 1).trim();
  }
  jsonText = jsonText.replace(/;\s*$/, '');
  return JSON.parse(jsonText);
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function screenFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  const match = STATUS_URL.exec(url);
  return match ? match[1] : null;
}

function quotedScreenName(tweet: RawTweetBody): string | null {
  const fromPermalink =
    screenFromUrl(tweet.quoted_status_permalink?.expanded) ||
    screenFromUrl(tweet.quoted_status_permalink?.url);
  if (fromPermalink) return fromPermalink;

  if (!tweet.quoted_status_id_str && !tweet.quoted_status_id) {
    return null;
  }
  for (const entry of tweet.entities?.urls ?? []) {
    const screen = screenFromUrl(entry.expanded_url) || screenFromUrl(entry.url);
    if (screen) return screen;
  }
  return null;
}

function readAccount(payload: unknown): ArchiveAccount | null {
  const rows = asArray<{ account?: ArchiveAccount }>(payload);
  const account = rows.find((row) => row?.account)?.account;
  if (!account?.username) return null;
  return account;
}

function rankForIndex(index: number): UserNode['rank'] {
  if (index < 8) return 'S';
  if (index < 23) return 'A';
  if (index < 48) return 'B';
  return 'C';
}

function ringForIndex(index: number): UserNode['ring'] {
  if (index < 8) return 1;
  if (index < 23) return 2;
  return 3;
}

function dominantInteraction(users: UserNode[]): CircleData['stats']['topInteractionType'] {
  const totals = users.reduce(
    (acc, user) => {
      acc.replies += user.interactions.replies;
      acc.quotes += user.interactions.quotes;
      acc.retweets += user.interactions.retweets;
      return acc;
    },
    { replies: 0, quotes: 0, retweets: 0 }
  );
  if (totals.quotes >= totals.replies && totals.quotes >= totals.retweets && totals.quotes > 0) {
    return 'quotes';
  }
  if (totals.retweets >= totals.replies && totals.retweets > 0) {
    return 'retweets';
  }
  return 'replies';
}

async function loadArchiveText(file: File): Promise<{ tweets: string[]; account: ArchiveAccount | null }> {
  if (file.name.endsWith('.zip')) {
    const zip = await JSZip.loadAsync(file);
    const tweetFiles = zip
      .file(TWEET_FILE)
      .filter((entry) => !entry.dir)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    if (tweetFiles.length === 0) {
      throw new Error('未在压缩包中找到 tweets.js，请确认是否为 X 官方归档包。');
    }

    const tweets = await Promise.all(tweetFiles.map((entry) => entry.async('text')));
    const accountEntry = zip.file(ACCOUNT_FILE).find((entry) => !entry.dir);
    let account: ArchiveAccount | null = null;
    if (accountEntry) {
      try {
        account = readAccount(parseYtdPayload(await accountEntry.async('text')));
      } catch {
        account = null;
      }
    }
    return { tweets, account };
  }

  if (file.name.endsWith('.js') || file.name.endsWith('.json')) {
    return { tweets: [await file.text()], account: null };
  }

  throw new Error('不支持的文件类型。请上传 X 官方归档的 .zip 或 tweets.js。');
}

export async function parseTwitterArchive(file: File): Promise<CircleData> {
  const { tweets: tweetFiles, account } = await loadArchiveText(file);
  const selfHandle = account?.username?.replace(/^@/, '').trim() || '';
  const selfKey = selfHandle.toLowerCase();
  const isSelf = (handle: string) => selfKey !== '' && handle.toLowerCase() === selfKey;

  const rawTweets: RawTweet[] = [];
  for (const content of tweetFiles) {
    try {
      rawTweets.push(...asArray<RawTweet>(parseYtdPayload(content)));
    } catch (err) {
      throw new Error(`推文数据解析失败: ${(err as Error).message}`);
    }
  }

  const userMap = new Map<string, InteractionBucket>();
  let totalInteractionsCount = 0;

  const bump = (handle: string, name: string, field: keyof Pick<InteractionBucket, 'replies' | 'quotes' | 'retweets' | 'mentions'>) => {
    if (!handle || isSelf(handle)) return;
    const key = handle.toLowerCase();
    const existing = userMap.get(key) || {
      handle,
      name: name || handle,
      replies: 0,
      quotes: 0,
      retweets: 0,
      mentions: 0,
    };
    if (name && name !== handle) existing.name = name;
    existing[field] += 1;
    totalInteractionsCount += 1;
    userMap.set(key, existing);
  };

  for (const item of rawTweets) {
    const tweet = item.tweet;
    if (!tweet) continue;

    const fullText = tweet.full_text || '';
    const retweetMatch = /^RT @([A-Za-z0-9_]{1,15})/.exec(fullText);
    if (retweetMatch) {
      // A retweet repeats the original mentions. Count only the retweeted account.
      bump(retweetMatch[1], retweetMatch[1], 'retweets');
      continue;
    }

    const replyTo = tweet.in_reply_to_screen_name;
    if (replyTo) bump(replyTo, replyTo, 'replies');

    const quoted = quotedScreenName(tweet);
    if (quoted && quoted.toLowerCase() !== replyTo?.toLowerCase()) {
      bump(quoted, quoted, 'quotes');
    }

    for (const mention of tweet.entities?.user_mentions ?? []) {
      const handle = mention.screen_name;
      if (!handle) continue;
      if (replyTo && handle.toLowerCase() === replyTo.toLowerCase()) continue;
      if (quoted && handle.toLowerCase() === quoted.toLowerCase()) continue;
      bump(handle, mention.name || handle, 'mentions');
    }
  }

  if (userMap.size === 0) {
    throw new Error('归档中未检测到对其他用户的互动记录。');
  }

  const scoredUsers: UserNode[] = Array.from(userMap.values())
    .map((user) => {
      const total = user.replies + user.quotes + user.retweets + user.mentions;
      const score = Math.round(user.replies * 3 + user.quotes * 2.5 + user.retweets * 1.5 + user.mentions);

      // The archive only contains tweets you sent, so inbound replies are unknowable.
      const relationship: RelationshipType = 'admire';
      const badges: string[] = [];
      if (user.replies >= 15) badges.push('深度畅聊');
      if (user.quotes >= 8) badges.push('高频引用');
      if (user.retweets >= 10) badges.push('死忠转推');
      if (badges.length === 0) badges.push('常客互动');

      return {
        id: `user-${user.handle.toLowerCase()}`,
        name: user.name || user.handle,
        handle: user.handle,
        avatar: '',
        score,
        rank: 'C' as const,
        ring: 3 as const,
        relationship,
        interactions: {
          replies: user.replies,
          quotes: user.quotes,
          retweets: user.retweets,
          mentions: user.mentions,
          total,
        },
        badges,
      };
    })
    .sort((a, b) => b.score - a.score || b.interactions.total - a.interactions.total);

  const ranked = scoredUsers.slice(0, 80).map((user, index) => ({
    ...user,
    rank: rankForIndex(index),
    ring: ringForIndex(index),
  }));

  const innerRing = ranked.filter((user) => user.ring === 1);
  const middleRing = ranked.filter((user) => user.ring === 2);
  const outerRing = ranked.filter((user) => user.ring === 3).slice(0, 24);

  return {
    targetUser: {
      name: account?.accountDisplayName || selfHandle || '我',
      handle: selfHandle || 'me',
      avatar: '',
      bio: selfHandle
        ? '从 X 官方归档本地计算。归档不含别人发给你的回复，无法判断双向关系。'
        : '归档里没有 account.js，中心账号未知。统计只含你发出的互动。',
    },
    innerRing,
    middleRing,
    outerRing,
    allUsers: ranked,
    generatedAt: new Date().toISOString(),
    source: 'archive',
    stats: {
      totalInteractions: totalInteractionsCount,
      mutualRatio: 0,
      topInteractionType: dominantInteraction(ranked),
    },
  };
}
