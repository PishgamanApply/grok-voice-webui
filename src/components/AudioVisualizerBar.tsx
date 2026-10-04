import React from 'react';

interface AudioVisualizerBarProps {
  energy: number; // 0 to 1
  barsCount?: number;
  activeColor?: string;
  isActive: boolean;
}

export const AudioVisualizerBar: React.FC<AudioVisualizerBarProps> = ({
  energy,
  barsCount = 28,
  activeColor = 'from-cyan-400 to-indigo-500',
  isActive,
}) => {
  return (
    <div className="flex items-center justify-center gap-1.5 h-12 w-full max-w-md px-4">
      {Array.from({ length: barsCount }).map((_, i) => {
        // Create natural wave variation
        const distance = Math.abs(i - barsCount / 2) / (barsCount / 2);
        const curve = 1 - distance * 0.6;
        const randomFactor = isActive ? (Math.sin(i * 1.5 + Date.now() / 200) * 0.3 + 0.7) : 0.1;
        const height = isActive
          ? Math.max(6, Math.min(48, energy * 48 * curve * randomFactor + 6))
          : 4;

        return (
          <div
            key={i}
            className={`w-1 rounded-full transition-all duration-75 ease-out ${
              isActive ? `bg-gradient-to-t ${activeColor} opacity-90` : 'bg-slate-800 opacity-40'
            }`}
            style={{
              height: `${height}px`,
            }}
          />
        );
      })}
    </div>
  );
};
