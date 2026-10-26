import React, { useState } from 'react';
import { Sparkles, FolderArchive, Loader2 } from 'lucide-react';

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
    <div className="w-full max-w-4xl mx-auto px-4 pt-6 pb-2">
      {/* Search Bar Container */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-2.5 sm:p-3 shadow-2xl shadow-indigo-950/20 backdrop-blur-xl">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-2">
          {/* Input field */}
          <div className="relative flex-1 w-full flex items-center">
            <span className="absolute left-3.5 text-slate-500 font-medium text-sm select-none">
              @
            </span>
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value.replace(/^@/, ''))}
              placeholder="输入 X / Twitter 用户名 (如 coldmountainlab)"
              className="w-full pl-8 pr-4 py-2.5 bg-slate-950/80 border border-slate-800/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>分析中...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-indigo-200" />
                  <span>生成互动圈</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onOpenArchiveModal}
              title="导入从 X 导出的归档 zip 或 tweets.js，享受 100% 隐私与无限历史"
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/80 text-slate-300 hover:text-white text-xs sm:text-sm font-medium rounded-xl transition-all cursor-pointer whitespace-nowrap"
            >
              <FolderArchive className="w-4 h-4 text-amber-400" />
              <span className="hidden md:inline">本地归档</span>
            </button>

            <button
              type="button"
              onClick={onLoadDemo}
              className="flex items-center justify-center gap-1 px-3 py-2.5 bg-slate-800/60 hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 text-xs sm:text-sm font-medium rounded-xl transition-all cursor-pointer whitespace-nowrap"
            >
              <span>Demo</span>
            </button>
          </div>
        </form>

        {/* Quick Picks */}
        <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-slate-800/60 text-xs text-slate-400 flex-wrap">
          <span className="text-slate-500">快速体验:</span>
          {['coldmountainlab', 'sama', 'levelsio', 'paulg', 'youyuxi'].map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => handleQuickPick(h)}
              className="px-2 py-0.5 rounded-md bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-indigo-300 transition-colors cursor-pointer"
            >
              @{h}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
