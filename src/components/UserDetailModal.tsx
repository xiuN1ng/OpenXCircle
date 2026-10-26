import React from 'react';
import { X, ExternalLink, HeartHandshake, Shield, Sparkles, MessageCircle, Repeat2, Quote, Award } from 'lucide-react';
import type { UserNode } from '../types';

interface UserDetailModalProps {
  user: UserNode | null;
  onClose: () => void;
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({ user, onClose }) => {
  if (!user) return null;

  const relationshipLabels = {
    mutual: {
      title: '双向奔赴 (Mutual Soulmates)',
      desc: '你们之间有频繁且平衡的双向回复与对话，同频共振！',
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
      icon: HeartHandshake,
    },
    fan: {
      title: '死忠守护 (Loyal Fan)',
      desc: 'TA 经常在你的推文下积极回复和转推，是你的忠实推友！',
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      icon: Shield,
    },
    admire: {
      title: '重点关注 (Active Follow)',
      desc: '你对 TA 的观点非常关注并主动保持交流。',
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      icon: Sparkles,
    },
  };

  const rel = relationshipLabels[user.relationship] || relationshipLabels.mutual;
  const RelIcon = rel.icon;

  const rankColors = {
    S: 'from-amber-400 to-rose-500 text-white',
    A: 'from-purple-500 to-indigo-500 text-white',
    B: 'from-blue-500 to-cyan-500 text-white',
    C: 'from-slate-600 to-slate-500 text-slate-200',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-indigo-950/50">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* User Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-slate-800 border-2 border-indigo-500/40 p-0.5 shadow-lg shadow-indigo-500/20 flex-shrink-0">
            <img
              src={user.avatar}
              alt={user.handle}
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
              className="w-full h-full object-cover rounded-[14px]"
            />
            <div className="w-full h-full flex items-center justify-center font-bold text-lg text-slate-300">
              {user.handle.charAt(0).toUpperCase()}
            </div>
            {/* Rank badge */}
            <div className={`absolute bottom-0 right-0 px-1.5 py-0.2 rounded-tl-lg text-[10px] font-black bg-gradient-to-r ${rankColors[user.rank]}`}>
              {user.rank}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-white truncate">
                {user.name}
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                第 {user.ring} 轨道星球
              </span>
            </div>
            <a
              href={`https://x.com/${user.handle}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 mt-0.5"
            >
              <span>@{user.handle}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Relationship Banner */}
        <div className={`p-4 rounded-2xl border mb-5 ${rel.color}`}>
          <div className="flex items-center gap-2 font-bold text-xs mb-1">
            <RelIcon className="w-4 h-4" />
            <span>{rel.title}</span>
          </div>
          <p className="text-xs opacity-90 leading-relaxed">{rel.desc}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
            <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
              <Award className="w-3 h-3 text-amber-400" /> 亲密度
            </span>
            <p className="text-base font-black text-amber-400 mt-1">{user.score} <span className="text-[10px] text-slate-500">pts</span></p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
            <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
              <MessageCircle className="w-3 h-3 text-indigo-400" /> 回复
            </span>
            <p className="text-base font-black text-white mt-1">{user.interactions.replies} <span className="text-[10px] text-slate-500">次</span></p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
            <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
              <Repeat2 className="w-3 h-3 text-emerald-400" /> 转推
            </span>
            <p className="text-base font-black text-white mt-1">{user.interactions.retweets} <span className="text-[10px] text-slate-500">次</span></p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
            <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
              <Quote className="w-3 h-3 text-pink-400" /> 引用
            </span>
            <p className="text-base font-black text-white mt-1">{user.interactions.quotes} <span className="text-[10px] text-slate-500">次</span></p>
          </div>
        </div>

        {/* Badges */}
        <div className="mb-6">
          <span className="text-xs font-semibold text-slate-400 block mb-2">社交画像与互动标签</span>
          <div className="flex flex-wrap gap-2">
            {user.badges.map((b) => (
              <span
                key={b}
                className="px-2.5 py-1 text-xs rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 font-medium"
              >
                {b}
              </span>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 border-t border-slate-800">
          <a
            href={`https://x.com/${user.handle}`}
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold rounded-2xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <span>在 X (Twitter) 上查看 @{user.handle} 的主页</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};
