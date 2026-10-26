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
  const [isPlaying, setIsPlaying] = useState(false); // Static by default for maximum performance & legibility!
  const angleRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  const theme = THEMES[settings.theme] || THEMES.cosmic;

  // Stable paint function
  const paint = useCallback((angle: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 1000;
    if (canvas.width !== size || canvas.height !== size) {
      canvas.width = size;
      canvas.height = size;
    }

    drawCircleCanvas(ctx, size, size, data, theme, settings, angle);
  }, [data, theme, settings]);

  // Preload avatars and repaint as each image arrives
  useEffect(() => {
    let active = true;
    const urls = [
      data.targetUser.avatar,
      ...data.innerRing.map((u) => u.avatar),
      ...data.middleRing.map((u) => u.avatar),
      ...data.outerRing.map((u) => u.avatar),
    ].filter(Boolean);

    urls.forEach((url) => {
      preloadImage(url).then((img) => {
        if (img && active) {
          paint(angleRef.current);
        }
      });
    });

    return () => {
      active = false;
    };
  }, [data, paint]);

  // High performance animation loop (0 React re-renders per second!)
  useEffect(() => {
    paint(angleRef.current);

    if (!isPlaying || settings.rotationSpeed === 0) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      return;
    }

    const loop = () => {
      angleRef.current += 0.0025 * settings.rotationSpeed;
      paint(angleRef.current);
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, settings.rotationSpeed, paint]);

  return (
    <div className="relative w-full flex flex-col items-center justify-center p-2 sm:p-4">
      {/* Canvas Wrapper */}
      <div className="relative w-full max-w-[680px] aspect-square rounded-3xl overflow-hidden shadow-2xl shadow-indigo-950/60 border border-slate-800/80 bg-slate-950 group">
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain block select-none cursor-grab active:cursor-grabbing"
        />

        {/* Floating Controls */}
        <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 shadow-xl opacity-90 hover:opacity-100 transition-opacity">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? '暂停自转' : '开启公转'}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isPlaying ? <Pause className="w-4 h-4 text-indigo-400" /> : <Play className="w-4 h-4" />}
          </button>

          <button
            onClick={() => {
              angleRef.current = 0;
              paint(0);
            }}
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
