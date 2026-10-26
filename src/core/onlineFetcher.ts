import type { CircleData, UserNode, RelationshipType } from '../types';

interface FxTwitterUser {
  screen_name: string;
  name: string;
  avatar_url: string;
  description?: string;
  followers?: number;
  following?: number;
  tweets?: number;
  likes?: number;
}

interface RawInteractionEntry {
  tweetId: string;
  author: string;
  target: string;
  type: string;
  text: string;
  direction: 'inbound' | 'outbound';
  createdAt: number;
}

interface WorkerApiResponse {
  screenName: string;
  selfAvatarUrl?: string;
  counts?: {
    mentionsToYou: number;
    mentionsFromYou: number;
    mergedUniqueTweets: number;
  };
  aggregates?: {
    authorsToYou?: Record<string, number>;
    targetsFromYou?: Record<string, number>;
  };
  circleUsers?: Array<{
    id: string;
    screenName: string;
    displayName: string;
    avatarUrl?: string;
    avatarUrlPreview?: string;
    interactionScore: number;
    interactionCount: number;
  }>;
  entries?: RawInteractionEntry[];
  profileFollowers?: number;
  profileFollowing?: number;
  profileTweets?: number;
  profileLikes?: number;
}

// Configured Cloudflare Worker endpoint
const PROXY_ENDPOINT = 'https://openxcircle-proxy.xiuningkou.workers.dev';

export async function fetchOnlineCircle(handle: string): Promise<CircleData> {
  const cleanHandle = handle.replace(/^@/, '').trim();
  if (!cleanHandle) {
    throw new Error('请输入有效的 X 用户名');
  }

  // 1. Fetch real target profile from FxTwitter API for rich bio & exact display name
  let fxProfile: FxTwitterUser | null = null;
  try {
    const fxResp = await fetch(`https://api.fxtwitter.com/${cleanHandle}`, {
      headers: { 'Accept': 'application/json' },
    });
    if (fxResp.ok) {
      const fxData = await fxResp.json();
      if (fxData && fxData.user) {
        fxProfile = fxData.user;
      }
    }
  } catch (err) {
    console.warn('FxTwitter fetch profile notice:', err);
  }

  // 2. Fetch real interaction data from Cloudflare Worker Relay
  const workerUrl = `${PROXY_ENDPOINT}/?screenName=${encodeURIComponent(cleanHandle)}`;
  const resp = await fetch(workerUrl);

  if (!resp.ok) {
    throw new Error(`获取数据失败 (HTTP ${resp.status})，请检查推特用户名是否正确或稍后重试。`);
  }

  const rawData: WorkerApiResponse = await resp.json();

  if (!rawData.circleUsers || rawData.circleUsers.length === 0) {
    throw new Error(`未查到 @${cleanHandle} 在近期（30天内）有公开推文互动记录。`);
  }

  const authorsToYou = rawData.aggregates?.authorsToYou || {};
  const targetsFromYou = rawData.aggregates?.targetsFromYou || {};

  let mutualCount = 0;
  let fanCount = 0;
  let admireCount = 0;

  // Transform raw circleUsers to UserNode
  const scoredUsers: UserNode[] = rawData.circleUsers.map((u, i) => {
    const toYou = authorsToYou[u.screenName.toLowerCase()] || 0;
    const fromYou = targetsFromYou[u.screenName.toLowerCase()] || 0;

    let relationship: RelationshipType = 'mutual';
    if (toYou > 0 && fromYou > 0) {
      relationship = 'mutual';
      mutualCount += 1;
    } else if (toYou > fromYou) {
      relationship = 'fan';
      fanCount += 1;
    } else {
      relationship = 'admire';
      admireCount += 1;
    }

    const badges: string[] = [];
    if (i < 3) badges.push('核心挚友');
    if (toYou > 0 && fromYou > 0) badges.push('双向奔赴');
    else if (toYou > 2) badges.push('死忠守护');
    else if (fromYou > 2) badges.push('重点关注');

    if (u.interactionCount >= 5) badges.push('高频互动');
    else if (badges.length === 0) badges.push('常客互动');

    const repliesCount = Math.max(1, toYou + fromYou);
    const score = Math.min(99, Math.max(12, Math.round(u.interactionScore || (u.interactionCount * 10))));

    // Determine ring and rank
    const ring = (i < 6 ? 1 : i < 18 ? 2 : 3) as 1 | 2 | 3;
    const rank = (i < 6 ? 'S' : i < 18 ? 'A' : i < 35 ? 'B' : 'C') as 'S' | 'A' | 'B' | 'C';

    const avatar =
      u.avatarUrl ||
      `https://unavatar.io/x/${u.screenName}`;

    return {
      id: u.id || `real-${i}-${u.screenName}`,
      name: u.displayName || u.screenName,
      handle: u.screenName,
      avatar,
      score,
      rank,
      ring,
      relationship,
      interactions: {
        replies: repliesCount,
        quotes: Math.round(repliesCount * 0.25),
        retweets: Math.max(0, u.interactionCount - repliesCount),
        mentions: Math.round(repliesCount * 0.4),
        total: u.interactionCount || repliesCount,
      },
      badges,
    };
  });

  const innerRing = scoredUsers.filter((u) => u.ring === 1);
  const middleRing = scoredUsers.filter((u) => u.ring === 2);
  const outerRing = scoredUsers.filter((u) => u.ring === 3);

  const totalInteractions = rawData.counts
    ? rawData.counts.mentionsToYou + rawData.counts.mentionsFromYou
    : scoredUsers.reduce((sum, u) => sum + u.interactions.total, 0);

  const mutualRatio = scoredUsers.length > 0
    ? Math.round((mutualCount / scoredUsers.length) * 100)
    : 70;

  const targetName = fxProfile?.name || cleanHandle;
  const targetAvatar =
    rawData.selfAvatarUrl ||
    fxProfile?.avatar_url ||
    `https://unavatar.io/x/${cleanHandle}`;
  const targetBio = fxProfile?.description || `@${cleanHandle} 的 X 真实互动社交全景`;

  return {
    targetUser: {
      name: targetName,
      handle: cleanHandle,
      avatar: targetAvatar,
      bio: targetBio,
    },
    innerRing,
    middleRing,
    outerRing,
    allUsers: scoredUsers,
    generatedAt: new Date().toISOString(),
    source: 'online',
    stats: {
      totalInteractions,
      mutualRatio,
      topInteractionType: 'replies',
    },
  };
}
