import { usePlayerStore } from "../../store/player";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5];
const SPEEDS_MOBILE = [0.75, 1, 1.25];

interface Props {
  isPlaying: boolean;
  onPlayPause: () => void;
  onSkip: (delta: number) => void;
  duration: number;
  currentTime: number;
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function PlaybackControls({ isPlaying, onPlayPause, onSkip, duration, currentTime }: Props) {
  const { speed, setSpeed, looping, activeSection, abA, abB } = usePlayerStore();
  const abActive = abA !== null && abB !== null;

  return (
    <div className="bg-gray-900 border-t border-gray-800 px-3 py-3 lg:px-6 lg:py-4">
      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-3 text-xs text-gray-400 font-mono">
        <span className="w-8 text-right shrink-0">{fmtTime(currentTime)}</span>
        <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full"
            style={{ width: duration ? `${(currentTime / duration) * 100}%` : "0%" }}
          />
        </div>
        <span className="w-8 shrink-0">{fmtTime(duration)}</span>
      </div>

      {/* Transport row */}
      <div className="flex items-center justify-between gap-2">
        {/* Loop status — desktop only */}
        <div className="hidden lg:block w-40 shrink-0">
          {abActive && (
            <div className="text-xs text-yellow-400 flex items-center gap-1">
              <span>↺</span>
              <span>A/B loop</span>
            </div>
          )}
          {!abActive && looping && activeSection && (
            <div className="text-xs text-brand-400 flex items-center gap-1">
              <span>↺</span>
              <span className="truncate max-w-[110px]">{activeSection.name}</span>
            </div>
          )}
        </div>

        {/* Transport buttons */}
        <div className="flex items-center gap-2 lg:gap-3 mx-auto lg:mx-0">
          <button
            onClick={() => onSkip(-10)}
            className="w-10 h-10 lg:w-9 lg:h-9 rounded-full bg-gray-800 active:bg-gray-600 hover:bg-gray-700 text-sm flex items-center justify-center transition-colors"
            title="Back 10s"
          >⏮</button>
          <button
            onClick={() => onSkip(-5)}
            className="w-10 h-10 lg:w-9 lg:h-9 rounded-full bg-gray-800 active:bg-gray-600 hover:bg-gray-700 text-xs flex items-center justify-center transition-colors"
            title="Back 5s"
          >◀5</button>
          <button
            onClick={onPlayPause}
            className="w-14 h-14 lg:w-12 lg:h-12 rounded-full bg-brand-600 active:bg-brand-800 hover:bg-brand-700 text-2xl lg:text-xl flex items-center justify-center shadow-lg transition-colors"
          >
            {isPlaying ? "⏸" : "▶"}
          </button>
          <button
            onClick={() => onSkip(5)}
            className="w-10 h-10 lg:w-9 lg:h-9 rounded-full bg-gray-800 active:bg-gray-600 hover:bg-gray-700 text-xs flex items-center justify-center transition-colors"
            title="Forward 5s"
          >5▶</button>
          <button
            onClick={() => onSkip(10)}
            className="w-10 h-10 lg:w-9 lg:h-9 rounded-full bg-gray-800 active:bg-gray-600 hover:bg-gray-700 text-sm flex items-center justify-center transition-colors"
            title="Forward 10s"
          >⏭</button>
        </div>

        {/* Speed — desktop shows all 5, mobile shows 3 */}
        <div className="flex items-center gap-1 shrink-0 lg:w-40 justify-end">
          {/* Mobile: 3 speeds */}
          <div className="flex lg:hidden gap-1">
            {SPEEDS_MOBILE.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2 py-1.5 rounded text-xs font-medium transition-colors min-w-[40px] ${
                  speed === s ? "bg-brand-600 text-white" : "bg-gray-800 text-gray-400 active:bg-gray-600"
                }`}
              >
                {s}×
              </button>
            ))}
          </div>
          {/* Desktop: all 5 speeds */}
          <div className="hidden lg:flex gap-1">
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  speed === s ? "bg-brand-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile: loop status below transport */}
      <div className="lg:hidden mt-2 h-4 flex items-center justify-center">
        {abActive && (
          <span className="text-[10px] text-yellow-400">↺ A/B loop active</span>
        )}
        {!abActive && looping && activeSection && (
          <span className="text-[10px] text-brand-400">↺ Looping: {activeSection.name}</span>
        )}
      </div>
    </div>
  );
}
