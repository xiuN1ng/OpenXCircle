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

const PROXY_ENDPOINT = 'https://openxcircle-proxy.xiuningkou.workers.dev';

export async function fetchOnlineCircle(handle: string): Promise<CircleData> {
  const cleanHandle = handle.replace(/^@/, '').trim();
  if (!cleanHandle) {
    throw new Error('请输入有效的 X 用户名');
  }

  // 1. Fetch real target profile from FxTwitter API
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
  const sortedUsers = [...rawData.circleUsers].sort((a, b) => {
    const byScore = (b.interactionScore || 0) - (a.interactionScore || 0);
    if (byScore !== 0) return byScore;
    return (b.interactionCount || 0) - (a.interactionCount || 0);
  });

  let mutualCount = 0;

  // Transform raw circleUsers to UserNode
  const allScoredUsers: UserNode[] = sortedUsers.map((u, i) => {
    const toYou = authorsToYou[u.screenName.toLowerCase()] || 0;
    const fromYou = targetsFromYou[u.screenName.toLowerCase()] || 0;

    let relationship: RelationshipType = 'admire';
    if (toYou > 0 && fromYou > 0) {
      relationship = 'mutual';
      mutualCount += 1;
    } else if (toYou > fromYou) {
      relationship = 'fan';
    }

    const badges: string[] = [];
    if (i < 3) badges.push('核心挚友');
    if (toYou > 0 && fromYou > 0) badges.push('双向奔赴');
    else if (toYou > 2) badges.push('死忠守护');
    else if (fromYou > 2) badges.push('重点关注');

    if (u.interactionCount >= 5) badges.push('高频互动');
    else if (badges.length === 0) badges.push('常客互动');

    // The relay only returns directional totals, not quote/retweet splits.
    const directed = toYou + fromYou;
    const score = Math.min(99, Math.max(12, Math.round(u.interactionScore || (u.interactionCount * 10))));

    const rank = (i < 8 ? 'S' : i < 23 ? 'A' : i < 48 ? 'B' : 'C') as 'S' | 'A' | 'B' | 'C';

    const rawAvatar = u.avatarUrl || u.avatarUrlPreview;
    const avatar = rawAvatar
      ? `${PROXY_ENDPOINT}/?avatar=${encodeURIComponent(rawAvatar)}`
      : `https://api.dicebear.com/7.x/identicon/svg?seed=${u.screenName}`;

    return {
      id: u.id || `real-${i}-${u.screenName}`,
      name: u.displayName || u.screenName,
      handle: u.screenName,
      avatar,
      score,
      rank,
      ring: (i < 8 ? 1 : i < 23 ? 2 : 3) as 1 | 2 | 3,
      relationship,
      interactions: {
        replies: directed,
        quotes: 0,
        retweets: 0,
        mentions: 0,
        total: u.interactionCount || directed,
      },
      badges,
    };
  });

  // Balanced layout for 3 orbital rings (8 in inner, 15 in middle, 24 in outer = 47 total on canvas)
  // This completely eliminates avatar crowding and makes it look gorgeous!
  const innerRing = allScoredUsers.slice(0, 8).map((u) => ({ ...u, ring: 1 as const }));
  const middleRing = allScoredUsers.slice(8, 23).map((u) => ({ ...u, ring: 2 as const }));
  const outerRing = allScoredUsers.slice(23, 47).map((u) => ({ ...u, ring: 3 as const }));

  const totalInteractions = rawData.counts
    ? rawData.counts.mentionsToYou + rawData.counts.mentionsFromYou
    : allScoredUsers.reduce((sum, u) => sum + u.interactions.total, 0);

  const mutualRatio = allScoredUsers.length > 0
    ? Math.round((mutualCount / allScoredUsers.length) * 100)
    : 0;

  const targetName = fxProfile?.name || cleanHandle;
  const rawTargetAvatar = rawData.selfAvatarUrl || fxProfile?.avatar_url;
  const targetAvatar = rawTargetAvatar
    ? `${PROXY_ENDPOINT}/?avatar=${encodeURIComponent(rawTargetAvatar)}`
    : `https://api.dicebear.com/7.x/identicon/svg?seed=${cleanHandle}`;

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
    allUsers: allScoredUsers, // Keep all 85 users in allUsers for TierList and Insights!
    generatedAt: new Date().toISOString(),
    source: 'online',
    stats: {
      totalInteractions,
      mutualRatio,
      topInteractionType: 'replies',
    },
  };
}
