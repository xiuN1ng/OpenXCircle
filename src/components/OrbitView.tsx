import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, RefreshCw, Download } from 'lucide-react';
import { drawCircleCanvas, preloadImage } from '../core/canvasRenderer';
import { THEMES } from '../core/themes';
import type { CircleData, CustomizationSettings } from '../types';

interface OrbitViewProps {
  data: CircleData;
  settings: CustomizationSettings;
  onOpenExport: () => void;
}

export const OrbitView: React.FC<OrbitViewProps> = ({
  data,
  settings,
  onOpenExport,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [rotationAngle, setRotationAngle] = useState(0);
  const animFrameRef = useRef<number | null>(null);

  const theme = THEMES[settings.theme] || THEMES.cosmic;

  // Preload avatars
  useEffect(() => {
    preloadImage(data.targetUser.avatar);
    data.innerRing.forEach((u) => preloadImage(u.avatar));
    data.middleRing.forEach((u) => preloadImage(u.avatar));
    data.outerRing.forEach((u) => preloadImage(u.avatar));
  }, [data]);

  // Render function
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use high resolution for crisp rendering
    const size = 1000;
    if (canvas.width !== size || canvas.height !== size) {
      canvas.width = size;
      canvas.height = size;
    }

    drawCircleCanvas(ctx, size, size, data, theme, settings, rotationAngle);
  }, [data, theme, settings, rotationAngle]);

  // Animation loop
  useEffect(() => {
    render();

    if (!isPlaying || settings.rotationSpeed === 0) return;

    const animate = () => {
      setRotationAngle((prev) => prev + 0.003 * settings.rotationSpeed);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, settings.rotationSpeed, render]);

  return (
    <div className="relative w-full flex flex-col items-center justify-center p-2 sm:p-4">
      {/* Canvas Wrapper */}
      <div className="relative w-full max-w-[680px] aspect-square rounded-3xl overflow-hidden shadow-2xl shadow-indigo-950/60 border border-slate-800/80 bg-slate-950 group">
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain block select-none cursor-grab active:cursor-grabbing"
        />

        {/* Floating Quick Action Controls */}
        <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 shadow-xl opacity-90 hover:opacity-100 transition-opacity">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? '暂停自转' : '开启公转'}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setRotationAngle(0)}
            title="复位角度"
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

          <button
            onClick={onOpenExport}
            title="导出超清海报"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>保存</span>
          </button>
        </div>

        {/* Source info pill */}
        <div className="absolute top-4 left-4">
          <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-900/80 backdrop-blur-md border border-slate-800 text-slate-300 shadow-md">
            {data.source === 'archive'
              ? '📦 X 官方归档历史全量'
              : data.source === 'online'
              ? '⚡ 公开实时搜索'
              : '✨ 预设演示 Demo'}
          </span>
        </div>
      </div>
    </div>
  );
};
