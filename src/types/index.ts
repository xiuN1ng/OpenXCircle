export type RelationshipType = 'mutual' | 'fan' | 'admire';

export interface UserInteractions {
  replies: number;
  quotes: number;
  retweets: number;
  mentions: number;
  total: number;
}

export interface UserNode {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  score: number;
  rank: 'S' | 'A' | 'B' | 'C';
  ring: 1 | 2 | 3;
  relationship: RelationshipType;
  interactions: UserInteractions;
  badges: string[];
}

export interface TargetUser {
  name: string;
  handle: string;
  avatar: string;
  bio?: string;
}

export interface CircleData {
  targetUser: TargetUser;
  innerRing: UserNode[];   // 核心内圈 (最亲密好友, 6~8人)
  middleRing: UserNode[];  // 活跃中圈 (高频互动, 12~16人)
  outerRing: UserNode[];   // 泛交外圈 (日常互动, 20~28人)
  allUsers: UserNode[];
  generatedAt: string;
  source: 'online' | 'archive' | 'demo';
  stats: {
    totalInteractions: number;
    mutualRatio: number; // 互撩比例 (0-100%)
    topInteractionType: 'replies' | 'quotes' | 'retweets';
  };
}

export type ThemePreset = 'cosmic' | 'cyberpunk' | 'aurora' | 'matrix' | 'sunset' | 'clean';

export interface ThemeConfig {
  id: ThemePreset;
  name: string;
  bgGradient: [string, string, string];
  ringColors: [string, string, string];
  glowColor: string;
  textColor: string;
  accentColor: string;
}

export interface CustomizationSettings {
  theme: ThemePreset;
  watermarkText: string;
  showWatermark: boolean;
  showHandles: boolean;
  showCenterAvatar: boolean;
  ringCount: 2 | 3;
  avatarSize: number; // 32 - 64
  rotationSpeed: number; // 0 (static) - 2 (fast)
  viewMode: 'orbit' | 'galaxy3d' | 'tierlist' | 'insights';
  exportScale: 2 | 4; // 2x or 4K
}
