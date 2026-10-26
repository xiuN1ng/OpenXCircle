import React, { useState } from 'react';
import { Sparkles, FolderArchive, Loader2, Search } from 'lucide-react';

interface SearchBannerProps {
  onSearch: (handle: string) => void;
  onOpenArchiveModal: () => void;
  onLoadDemo: () => void;
  isLoading: boolean;
  currentHandle: string;
}

export const SearchBanner: React.FC<SearchBannerProps> = ({
  onSearch,
  onOpenArchiveModal,
  onLoadDemo,
  isLoading,
  currentHandle,
}) => {
  const [inputVal, setInputVal] = useState(currentHandle || 'coldmountainlab');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      onSearch(inputVal.trim());
    }
  };

  const handleQuickPick = (h: string) => {
    setInputVal(h);
    onSearch(h);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 pt-4 pb-2 animate-fade-in">
      <div className="bg-slate-900/75 border border-slate-800/80 rounded-2xl p-2.5 sm:p-3 shadow-xl shadow-indigo-950/30 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input Form */}
        <form onSubmit={handleSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1 flex items-center">
            <span className="absolute left-3.5 text-indigo-400 font-mono text-sm select-none">
              @
            </span>
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value.replace(/^@/, ''))}
              placeholder="输入 X / Twitter 用户名 (如 coldmountainlab, sama)..."
              className="w-full pl-8 pr-10 py-2 bg-slate-950/80 border border-slate-800/90 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/80 transition-all font-mono"
            />
            {inputVal && (
              <button
                type="button"
                onClick={() => setInputVal('')}
                className="absolute right-3 text-slate-500 hover:text-slate-300 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-md shadow-indigo-600/30 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>生成中</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" />
                <span>分析星系</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Picks & Actions */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
            <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              推荐:
            </span>
            {['coldmountainlab', 'sama', 'levelsio', 'youyuxi'].map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => handleQuickPick(h)}
                className={`px-2 py-1 rounded-lg text-[11px] transition-all cursor-pointer whitespace-nowrap ${
                  inputVal === h
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                @{h}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-slate-800 hidden md:block" />

          {/* Local Archive & Demo Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onOpenArchiveModal}
              title="导入本地推特归档数据 (tweets.js 或 zip)"
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 hover:text-white text-xs rounded-xl transition-all cursor-pointer"
            >
              <FolderArchive className="w-3.5 h-3.5 text-amber-400" />
              <span>归档</span>
            </button>

            <button
              type="button"
              onClick={onLoadDemo}
              className="px-2.5 py-1 bg-slate-800/40 hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 text-xs rounded-xl transition-all cursor-pointer"
            >
              Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
