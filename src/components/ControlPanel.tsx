import React from 'react';
import { Palette, Sliders, Orbit, Sparkles } from 'lucide-react';
import { THEMES } from '../core/themes';
import type { CustomizationSettings, ThemePreset } from '../types';

interface ControlPanelProps {
  settings: CustomizationSettings;
  onUpdateSettings: (newSettings: Partial<CustomizationSettings>) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  settings,
  onUpdateSettings,
}) => {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-4">
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-md space-y-5">
        {/* Section 1: Themes */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Palette className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              宇宙主题配色
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {(Object.keys(THEMES) as ThemePreset[]).map((key) => {
              const th = THEMES[key];
              const isSelected = settings.theme === key;
              return (
                <button
                  key={key}
                  onClick={() => onUpdateSettings({ theme: key })}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-md shadow-indigo-500/20'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: th.glowColor }}
                    />
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: th.accentColor }}
                    />
                  </div>
                  <span className="truncate">{th.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Canvas Adjustments */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-800/80">
          {/* Ring Count */}
          <div>
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5">
                <Orbit className="w-3.5 h-3.5 text-indigo-400" />
                轨道层级数
              </span>
              <span className="text-indigo-400 font-bold">{settings.ringCount} 圈</span>
            </label>
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => onUpdateSettings({ ringCount: 2 })}
                className={`flex-1 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  settings.ringCount === 2
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                2 圈 (精简)
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ ringCount: 3 })}
                className={`flex-1 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  settings.ringCount === 3
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                3 圈 (全景)
              </button>
            </div>
          </div>

          {/* Avatar Size */}
          <div>
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                头像缩放
              </span>
              <span className="text-indigo-400 font-bold">{settings.avatarSize}px</span>
            </label>
            <input
              type="range"
              min="24"
              max="60"
              value={settings.avatarSize}
              onChange={(e) => onUpdateSettings({ avatarSize: Number(e.target.value) })}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* Orbit Speed */}
          <div>
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                公转速度
              </span>
              <span className="text-indigo-400 font-bold">{settings.rotationSpeed}x</span>
            </label>
            <input
              type="range"
              min="0"
              max="3"
              step="0.5"
              value={settings.rotationSpeed}
              onChange={(e) => onUpdateSettings({ rotationSpeed: Number(e.target.value) })}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>
        </div>

        {/* Section 3: Labels and Watermark */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300">
              <input
                type="checkbox"
                checked={settings.showHandles}
                onChange={(e) => onUpdateSettings({ showHandles: e.target.checked })}
                className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-indigo-500 accent-indigo-500"
              />
              <span>显示推特 Handle 标签</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300">
              <input
                type="checkbox"
                checked={settings.showWatermark}
                onChange={(e) => onUpdateSettings({ showWatermark: e.target.checked })}
                className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-indigo-500 accent-indigo-500"
              />
              <span>显示右下角水印</span>
            </label>
          </div>

          {settings.showWatermark && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-slate-500 whitespace-nowrap">自定义水印:</span>
              <input
                type="text"
                value={settings.watermarkText}
                onChange={(e) => onUpdateSettings({ watermarkText: e.target.value })}
                className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500 w-full sm:w-48"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
