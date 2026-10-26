import React from 'react';
import { Trophy, MessageCircle, Repeat2 } from 'lucide-react';
import type { CircleData, UserNode } from '../types';

interface TierListViewProps {
  data: CircleData;
  onSelectUser?: (user: UserNode) => void;
}

export const TierListView: React.FC<TierListViewProps> = ({ data, onSelectUser }) => {
  const tiers: {
    rank: 'S' | 'A' | 'B' | 'C';
    title: string;
    description: string;
    color: string;
    badgeBg: string;
    users: UserNode[];
  }[] = [
    {
      rank: 'S',
      title: 'S 级 · 核心挚友 (Soulmates)',
      description: '最高频互动，几乎每条动态都有彼此的身影，双向奔赴的推特搭子',
      color: 'from-amber-500 to-rose-500',
      badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      users: data.innerRing,
    },
    {
      rank: 'A',
      title: 'A 级 · 深度好友 (Inner Circle)',
      description: '定期观点交流、长文回复探讨与高频转推点赞',
      color: 'from-purple-500 to-indigo-500',
      badgeBg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      users: data.middleRing,
    },
    {
      rank: 'B',
      title: 'B 级 · 活跃搭子 (Frequent Friends)',
      description: '在特定话题、技术探讨或生活动态中保持交流',
      color: 'from-blue-500 to-cyan-500',
      badgeBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      users: data.outerRing.slice(0, 14),
    },
    {
      rank: 'C',
      title: 'C 级 · 泛交之友 (Acquaintances)',
      description: '偶尔互动、互相点赞与默默关注',
      color: 'from-slate-500 to-slate-400',
      badgeBg: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
      users: data.outerRing.slice(14),
    },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            推特互动好友段位金字塔
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            基于多维度互动加权（回复 ×3、引用 ×2.5、转推 ×1.5、艾特 ×1）综合计算 · 点击卡片查看关系画像
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400">总分析互动数</span>
          <p className="text-lg font-bold text-indigo-400">{data.stats.totalInteractions} 次</p>
        </div>
      </div>

      <div className="space-y-6">
        {tiers.map((tier) => (
          <div
            key={tier.rank}
            className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-sm"
          >
            {/* Tier Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 text-sm font-black rounded-xl border ${tier.badgeBg}`}
                >
                  {tier.rank} Tier
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">{tier.title}</h3>
                  <p className="text-xs text-slate-400">{tier.description}</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {tier.users.length} 位好友
              </span>
            </div>

            {/* User Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {tier.users.map((user) => (
                <div
                  key={user.id}
                  onClick={() => onSelectUser?.(user)}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-indigo-500/50 hover:bg-slate-800/60 transition-all group cursor-pointer hover:scale-[1.02]"
                >
                  {/* Left: Avatar + Names */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-slate-800 flex-shrink-0 border border-slate-700">
                      <img
                        src={user.avatar}
                        alt={user.handle}
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                        className="w-full h-full object-cover"
                      />
                      <div className="w-full h-full flex items-center justify-center font-bold text-xs text-slate-300">
                        {user.handle.charAt(0).toUpperCase()}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-200 truncate group-hover:text-indigo-300 transition-colors">
                        {user.name}
                      </p>
                      <span className="text-[11px] text-slate-400 truncate block">
                        @{user.handle}
                      </span>
                    </div>
                  </div>

                  {/* Right: Score & Badges */}
                  <div className="text-right flex-shrink-0 pl-2">
                    <span className="text-xs font-extrabold text-indigo-400">
                      {user.score} <span className="text-[10px] font-normal text-slate-500">pts</span>
                    </span>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400">
                      <span className="flex items-center gap-0.5" title="回复次数">
                        <MessageCircle className="w-2.5 h-2.5 text-indigo-400" />
                        {user.interactions.replies}
                      </span>
                      <span className="flex items-center gap-0.5" title="转推次数">
                        <Repeat2 className="w-2.5 h-2.5 text-emerald-400" />
                        {user.interactions.retweets}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
