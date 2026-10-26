import JSZip from 'jszip';
import type { CircleData, UserNode, RelationshipType } from '../types';

interface RawTweetEntity {
  name: string;
  screen_name: string;
  id_str: string;
}

interface RawTweet {
  tweet?: {
    full_text?: string;
    in_reply_to_screen_name?: string;
    created_at?: string;
    entities?: {
      user_mentions?: RawTweetEntity[];
    };
  };
}

export async function parseTwitterArchive(
  file: File,
  targetHandle: string = 'me'
): Promise<CircleData> {
  let tweetsJsonContent = '';

  if (file.name.endsWith('.zip')) {
    const zip = new JSZip();
    const contents = await zip.loadAsync(file);

    // Look for tweets.js or tweet.js
    const possiblePaths = [
      'data/tweets.js',
      'data/tweet.js',
      'tweets.js',
      'data/tweets.json',
      'data/tweet.json',
    ];

    let foundFile = null;
    for (const path of possiblePaths) {
      if (contents.files[path]) {
        foundFile = contents.files[path];
        break;
      }
    }

    if (!foundFile) {
      // Find any file ending with tweets.js
      const matching = Object.keys(contents.files).find(
        (key) => key.endsWith('tweets.js') || key.endsWith('tweet.js')
      );
      if (matching) {
        foundFile = contents.files[matching];
      }
    }

    if (!foundFile) {
      throw new Error('未在压缩包中找到 tweets.js 或 tweet.js 数据文件，请确认是否为 Twitter 官方归档包。');
    }

    tweetsJsonContent = await foundFile.async('text');
  } else if (file.name.endsWith('.js') || file.name.endsWith('.json')) {
    tweetsJsonContent = await file.text();
  } else {
    throw new Error('不支持的文件类型。请上传 Twitter 官方归档的 .zip 文件或 tweets.js 文件。');
  }

  // Parse JS variable assignment e.g. "window.YTD.tweets.part0 = [ ... ];"
  const cleanJson = tweetsJsonContent
    .replace(/^window\.YTD\.[a-zA-Z0-9_.]+\s*=\s*/, '')
    .trim()
    .replace(/;$/, '');

  let rawTweets: RawTweet[] = [];
  try {
    rawTweets = JSON.parse(cleanJson);
  } catch (err) {
    throw new Error(`推文数据解析失败: ${(err as Error).message}`);
  }

  // User interaction stats map
  const userMap = new Map<
    string,
    {
      handle: string;
      name: string;
      replies: number;
      quotes: number;
      retweets: number;
      mentions: number;
      lastDate?: string;
    }
  >();

  let totalInteractionsCount = 0;

  for (const item of rawTweets) {
    const tweet = item.tweet;
    if (!tweet) continue;

    const fullText = tweet.full_text || '';
    const isRetweet = fullText.startsWith('RT @');
    const inReplyTo = tweet.in_reply_to_screen_name;
    const mentions = tweet.entities?.user_mentions || [];

    // 1. Reply
    if (inReplyTo && inReplyTo.toLowerCase() !== targetHandle.toLowerCase()) {
      const key = inReplyTo.toLowerCase();
      const existing = userMap.get(key) || {
        handle: inReplyTo,
        name: inReplyTo,
        replies: 0,
        quotes: 0,
        retweets: 0,
        mentions: 0,
        lastDate: tweet.created_at,
      };
      existing.replies += 1;
      totalInteractionsCount += 1;
      userMap.set(key, existing);
    }

    // 2. Mentions & Retweets
    for (const mention of mentions) {
      const handle = mention.screen_name;
      if (handle.toLowerCase() === targetHandle.toLowerCase()) continue;
      const key = handle.toLowerCase();

      const existing = userMap.get(key) || {
        handle: mention.screen_name,
        name: mention.name || mention.screen_name,
        replies: 0,
        quotes: 0,
        retweets: 0,
        mentions: 0,
        lastDate: tweet.created_at,
      };

      if (mention.name) {
        existing.name = mention.name;
      }

      if (isRetweet) {
        existing.retweets += 1;
      } else {
        existing.mentions += 1;
      }
      totalInteractionsCount += 1;
      userMap.set(key, existing);
    }
  }

  if (userMap.size === 0) {
    throw new Error('归档中未检测到对其他用户的互动记录。');
  }

  // Calculate scores
  // Weight: Replies * 3 + Quotes * 2.5 + Retweets * 1.5 + Mentions * 1
  const scoredUsers: UserNode[] = Array.from(userMap.values())
    .map((u, index) => {
      const total = u.replies + u.quotes + u.retweets + u.mentions;
      const score = Math.round(
        u.replies * 3 + u.quotes * 2.5 + u.retweets * 1.5 + u.mentions * 1
      );

      let relationship: RelationshipType = 'mutual';
      if (u.replies > 10 && u.retweets < 3) {
        relationship = 'mutual';
      } else if (u.retweets > u.replies * 2) {
        relationship = 'fan';
      } else {
        relationship = 'admire';
      }

      const badges: string[] = [];
      if (u.replies >= 15) badges.push('深度畅聊');
      if (u.retweets >= 10) badges.push('死忠转推');
      if (relationship === 'mutual') badges.push('双向同频');
      if (badges.length === 0) badges.push('常客互动');

      return {
        id: `user-${index}-${u.handle}`,
        name: u.name || u.handle,
        handle: u.handle,
        avatar: `https://unavatar.io/x/${u.handle}`,
        score,
        rank: 'B' as const,
        ring: 3 as const,
        relationship,
        interactions: {
          replies: u.replies,
          quotes: u.quotes,
          retweets: u.retweets,
          mentions: u.mentions,
          total,
        },
        badges,
      };
    })
    .sort((a, b) => b.score - a.score);

  // Top 50 users
  const topUsers = scoredUsers.slice(0, 50);

  // Assign Rings & Ranks
  const innerRing = topUsers.slice(0, 6).map((u) => ({
    ...u,
    ring: 1 as const,
    rank: 'S' as const,
  }));

  const middleRing = topUsers.slice(6, 20).map((u) => ({
    ...u,
    ring: 2 as const,
    rank: 'A' as const,
  }));

  const outerRing = topUsers.slice(20, 48).map((u) => ({
    ...u,
    ring: 3 as const,
    rank: (u.score > 20 ? 'B' : 'C') as 'B' | 'C',
  }));

  const allUsers = [...innerRing, ...middleRing, ...outerRing];

  return {
    targetUser: {
      name: targetHandle === 'me' ? 'My X Account' : targetHandle,
      handle: targetHandle,
      avatar: `https://unavatar.io/x/${targetHandle}`,
      bio: '从 X 官方归档数据本地计算生成的完整社交图谱',
    },
    innerRing,
    middleRing,
    outerRing,
    allUsers,
    generatedAt: new Date().toISOString(),
    source: 'archive',
    stats: {
      totalInteractions: totalInteractionsCount,
      mutualRatio: 72,
      topInteractionType: 'replies',
    },
  };
}
