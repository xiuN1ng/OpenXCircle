import React from 'react';
import { HeartHandshake, Zap, Flame, Sparkles, UserCheck } from 'lucide-react';
import type { CircleData } from '../types';

interface InsightsViewProps {
  data: CircleData;
}

export const InsightsView: React.FC<InsightsViewProps> = ({ data }) => {
  const mutualCount = data.allUsers.filter((u) => u.relationship === 'mutual').length;
  const fanCount = data.allUsers.filter((u) => u.relationship === 'fan').length;
  const admireCount = data.allUsers.filter((u) => u.relationship === 'admire').length;
  const totalUsers = data.allUsers.length || 1;

  const mutualPercent = Math.round((mutualCount / totalUsers) * 100);
  const fanPercent = Math.round((fanCount / totalUsers) * 100);
  const admirePercent = Math.max(0, 100 - mutualPercent - fanPercent);

  const interactionTotal = data.allUsers.reduce((sum, user) => sum + user.interactions.total, 0);
  const innerTotal = data.innerRing.reduce((sum, user) => sum + user.interactions.total, 0);
  const innerShare = interactionTotal > 0 ? Math.round((innerTotal / interactionTotal) * 100) : 0;
  const interactionLabels = {
    replies: '评论与回复',
    quotes: '引用',
    retweets: '转推',
  } as const;

  // Aggregate badge frequencies
  const badgeMap = new Map<string, number>();
  data.allUsers.forEach((u) => {
    u.badges.forEach((b) => {
      badgeMap.set(b, (badgeMap.get(b) || 0) + 1);
    });
  });

  const topBadges = Array.from(badgeMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1 */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-900/40 shadow-xl">
          <div className="flex items-center justify-between text-indigo-400 mb-2">
            <span className="text-xs font-semibold">互撩指数 (双向奔赴)</span>
            <HeartHandshake className="w-4 h-4" />
          </div>
          <p className="text-3xl font-black text-white">{mutualPercent}%</p>
          <p className="text-xs text-slate-400 mt-2">
            {data.source === 'archive'
              ? '归档只有你发出的推文，看不出对方有没有回复你'
              : <>圈内共有 <span className="text-indigo-300 font-bold">{mutualCount}</span> 位推友与你双向互动</>}
          </p>
        </div>

        {/* Card 2 */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-950/60 to-slate-900 border border-purple-900/40 shadow-xl">
          <div className="flex items-center justify-between text-purple-400 mb-2">
            <span className="text-xs font-semibold">总互动频次</span>
            <Zap className="w-4 h-4" />
          </div>
          <p className="text-3xl font-black text-white">{data.stats.totalInteractions}</p>
          <p className="text-xs text-slate-400 mt-2">
            以 <span className="text-purple-300 font-bold">{interactionLabels[data.stats.topInteractionType]}</span> 为主要交流形式
          </p>
        </div>

        {/* Card 3 */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-950/60 to-slate-900 border border-rose-950/40 shadow-xl">
          <div className="flex items-center justify-between text-rose-400 mb-2">
            <span className="text-xs font-semibold">核心密友圈层</span>
            <Flame className="w-4 h-4" />
          </div>
          <p className="text-3xl font-black text-white">{data.innerRing.length} <span className="text-sm font-normal text-slate-400">位</span></p>
          <p className="text-xs text-slate-400 mt-2">
            占据了你推特总互动量的 <span className="text-rose-300 font-bold">{innerShare}%</span>
          </p>
        </div>
      </div>

      {/* Relationship Balance Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-4">
          <UserCheck className="w-4 h-4 text-indigo-400" />
          社交关系平衡天平 (谁在关注你 vs 你在关注谁)
        </h3>

        {/* Progress bar */}
        <div className="w-full h-4 rounded-full overflow-hidden flex bg-slate-800 shadow-inner">
          <div
            style={{ width: `${mutualPercent}%` }}
            className="bg-indigo-500 hover:opacity-90 transition-all"
            title={`双向奔赴: ${mutualPercent}%`}
          />
          <div
            style={{ width: `${fanPercent}%` }}
            className="bg-emerald-500 hover:opacity-90 transition-all"
            title={`死忠守护 (对方互动多): ${fanPercent}%`}
          />
          <div
            style={{ width: `${admirePercent}%` }}
            className="bg-amber-500 hover:opacity-90 transition-all"
            title={`单向仰望 (你互动多): ${admirePercent}%`}
          />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-indigo-500 inline-block" />
            <span className="text-slate-300 font-medium">双向奔赴圈</span>
            <span className="text-slate-500">({mutualPercent}% - {mutualCount}人)</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
            <span className="text-slate-300 font-medium">死忠守护 (对你高频转赞)</span>
            <span className="text-slate-500">({fanPercent}% - {fanCount}人)</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
            <span className="text-slate-300 font-medium">默默关注 (你主动交流较多)</span>
            <span className="text-slate-500">({admirePercent}% - {admireCount}人)</span>
          </div>
        </div>
      </div>

      {/* Social Persona Tag Cloud */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-amber-400" />
          社交圈高频标签画像
        </h3>

        <div className="flex flex-wrap gap-2.5">
          {topBadges.map(([badge, count], idx) => (
            <span
              key={badge}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all hover:scale-105 ${
                idx === 0
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 text-sm'
                  : idx < 3
                  ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}
            >
              <span>{badge}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/50 text-slate-400">
                {count}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
