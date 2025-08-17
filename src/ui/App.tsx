import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Contract:
// Inputs: minutes:number only
// Behavior: countdown, calm music + buttons when done; Restart restarts, Stop just stops

function formatTime(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(String(h).padStart(2, '0'));
  parts.push(String(m).padStart(2, '0'));
  parts.push(String(s).padStart(2, '0'));
  return parts.join(':');
}

// A tiny procedural "calm music" pad that plays a slow 4-chord loop.
function useCalmMusic() {
  const ctxRef = useRef<AudioContext | null>(null);
  const loopTimerRef = useRef<number | null>(null);
  const activeNodesRef = useRef<Array<{ oscs: OscillatorNode[]; gain: GainNode }>>([]);

  const ensure = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return ctxRef.current!;
  }, []);

  const playChord = useCallback((frequencies: number[], duration = 3.6) => {
    const ctx = ensure();
    const gain = ctx.createGain();
    gain.gain.value = 0.0005;
    gain.connect(ctx.destination);

    const oscs: OscillatorNode[] = [];
    for (let i = 0; i < frequencies.length; i++) {
      const osc = ctx.createOscillator();
      const detune = (i - 1) * 3; // slight spread
      osc.type = 'sine';
      osc.frequency.value = frequencies[i];
      osc.detune.value = detune;
      osc.connect(gain);
      osc.start();
      oscs.push(osc);
    }

    const now = ensure().currentTime;
    const g = gain.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0.02, now + 1.2);
    g.linearRampToValueAtTime(0.01, now + duration - 0.4);
    g.linearRampToValueAtTime(0.0001, now + duration);

    // stop oscillators after envelope ends
    oscs.forEach((o) => o.stop(now + duration + 0.05));
    activeNodesRef.current.push({ oscs, gain });
  }, [ensure]);

  const start = useCallback(() => {
    const ctx = ensure();
    if (ctx.state === 'suspended') ctx.resume();

    // Simple progression: Cmaj -> Gmaj -> Amin -> Fmaj (Hz)
    const chords = [
      [261.63, 329.63, 392.00], // C E G
      [196.00, 246.94, 392.00], // G B G
      [220.00, 261.63, 329.63], // A C E
      [174.61, 220.00, 349.23], // F A F
    ];

    let idx = 0;
    // Play immediately
    playChord(chords[idx]);
    idx = (idx + 1) % chords.length;
    // Then loop every ~4s
    loopTimerRef.current = window.setInterval(() => {
      playChord(chords[idx]);
      idx = (idx + 1) % chords.length;
    }, 4000);
  }, [ensure, playChord]);

  const stop = useCallback(() => {
    if (loopTimerRef.current) {
      clearInterval(loopTimerRef.current);
      loopTimerRef.current = null;
    }
    const ctx = ensure();
    const now = ctx.currentTime;
    // Fade out any active gains
    activeNodesRef.current.forEach(({ oscs, gain }) => {
      try {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0.0001, now + 0.4);
        oscs.forEach((o) => o.stop(now + 0.45));
      } catch {}
    });
    activeNodesRef.current = [];
  }, [ensure]);

  return { start, stop };
}

export default function App() {
  const [minutes, setMinutes] = useState<number>(20);
  const [target, setTarget] = useState<number | null>(null);
  const [now, setNow] = useState(() => performance.now());
  const [ringing, setRinging] = useState(false);
  const { start: startMusic, stop: stopMusic } = useCalmMusic();
  const minutesRef = useRef<HTMLInputElement | null>(null);

  // Auto-focus and select the minutes field on launch
  useEffect(() => {
    // next tick to ensure element is mounted
    const t = setTimeout(() => {
      minutesRef.current?.focus();
      minutesRef.current?.select();
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // High-quality timer loop using rAF + setTimeout hybrid
  useEffect(() => {
    let raf = 0;
    let timer: any;
    let active = true;

    const tick = () => {
      if (!active) return;
      setNow(performance.now());
      raf = requestAnimationFrame(tick);
    };

    // rAF drives the display; a coarse timeout conserves CPU
    timer = setInterval(() => setNow(performance.now()), 250);
    raf = requestAnimationFrame(tick);
    return () => {
      active = false;
      clearInterval(timer);
      cancelAnimationFrame(raf);
    };
  }, []);

  const baseMs = useMemo(() => Math.max(0, minutes) * 60_000, [minutes]);
  const remaining = target ? Math.max(0, target - now) : baseMs;
  const running = !!target && remaining > 0 && !ringing;

  useEffect(() => {
    if (!target) return;
    if (remaining <= 0 && !ringing) {
    setRinging(true);
    // attempt to resume audio context on user gesture edge cases
    startMusic();
    }
  }, [remaining, target, ringing, startMusic]);

  const startTimer = useCallback(() => {
    const duration = baseMs;
    if (duration <= 0) return;
    setTarget(performance.now() + duration);
    setRinging(false);
  }, [baseMs]);

  const stopRingingAndRestart = useCallback(() => {
    stopMusic();
    // restart from the beginning using the latest inputs
    setRinging(false);
    setTarget(performance.now() + baseMs);
  }, [baseMs, stopMusic]);

  const stopRingingOnly = useCallback(() => {
    // stop the music and clear ringing, but do not restart the timer automatically
    stopMusic();
    setRinging(false);
    setTarget(null);
  }, [stopMusic]);

  return (
    <div className="relative min-h-screen flex items-center justify-center p-8 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden">
      {/* Ambient colorful clouds */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-cyan-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-32 h-96 w-96 rounded-full bg-indigo-500/25 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -left-20 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />

      <div className={`relative z-10 w-full max-w-md rounded-3xl bg-white/5 backdrop-blur-xl shadow-[0_30px_80px_rgba(0,0,0,0.6)] p-8 border border-white/10 ${ringing ? 'ring-2 ring-cyan-400/30' : ''}`}>
        <h1 className="text-3xl font-semibold tracking-tight mb-6 bg-gradient-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent">20 20 20 timer</h1>

        <form className="space-y-5 mb-8" onSubmit={(e) => { e.preventDefault(); startTimer(); }}>
          <div>
            <label className="block text-xs text-white/60 mb-1">Minutes</label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={59}
              value={minutes}
              onChange={(e) => setMinutes(Math.max(0, Math.min(59, Number(e.target.value) || 0)))}
              ref={minutesRef}
              className="w-full h-12 rounded-2xl bg-white/10 border border-white/15 px-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-sky-400/70 focus:bg-white/15"
              placeholder="20"
            />
          </div>
          <button
            type="submit"
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-400 hover:from-sky-400 hover:to-cyan-300 text-slate-900 font-semibold shadow-lg shadow-cyan-500/25 transition"
            disabled={ringing}
          >
            {running ? 'Running…' : 'Start'}
          </button>
        </form>

        <div className="text-center">
          <div className="inline-block rounded-2xl px-5 py-2 bg-white/5 border border-white/10 backdrop-blur-md">
            <div className="text-7xl md:text-8xl font-semibold tracking-tight tabular-nums font-mono text-sky-100 drop-shadow-[0_0_24px_rgba(125,200,255,0.25)] select-none">
            {formatTime(remaining)}
            </div>
          </div>
        </div>

  {ringing && (
          <div className="mt-10 flex flex-col items-center gap-4">
            <div className="text-white/85 text-sm">Time's up. Breathe in… breathe out.</div>
            <div className="flex gap-3">
              <button
                onClick={stopRingingAndRestart}
                className="h-12 px-6 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 hover:from-sky-400 hover:to-cyan-300 text-slate-900 font-semibold shadow-lg shadow-cyan-500/30 transition"
              >
                Restart
              </button>
              <button
                onClick={stopRingingOnly}
                className="h-12 px-6 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white/90 transition"
              >
                Stop
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
