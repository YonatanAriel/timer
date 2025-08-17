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

// Soft, calm chimes (two variants) using WebAudio. No harsh tones.
function useChimes() {
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<Array<AudioNode>>([]);

  const ensure = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return ctxRef.current!;
  }, []);

  const stopAll = useCallback(() => {
    const ctx = ensure();
    const now = ctx.currentTime;
    nodesRef.current.forEach((n) => {
      try {
        if ('gain' in (n as any)) {
          const g = (n as any).gain as GainNode['gain'];
          g.cancelScheduledValues(now);
          g.setValueAtTime((g as any).value ?? 0.001, now);
          g.linearRampToValueAtTime(0.0001, now + 0.25);
        }
        if ('stop' in (n as any)) (n as any).stop(now + 0.3);
      } catch {}
    });
    nodesRef.current = [];
  }, [ensure]);

  // A gentle bell-like triad (work end)
  const playWorkEnd = useCallback(() => {
    const ctx = ensure();
    if (ctx.state === 'suspended') ctx.resume();
    const out = ctx.createGain();
    out.gain.value = 0.12; // low volume
    out.connect(ctx.destination);

    const mkBell = (freq: number, detune = 0) => {
      const carrier = ctx.createOscillator();
      carrier.type = 'sine';
      carrier.frequency.value = freq;
      carrier.detune.value = detune;
      const gain = ctx.createGain();
      gain.gain.value = 0.0001;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 3500;
      carrier.connect(gain).connect(lp).connect(out);
      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
      carrier.start(now);
      carrier.stop(now + 1.7);
      nodesRef.current.push(carrier, gain, lp);
    };
    // C major light arpeggio
    mkBell(523.25); // C5
    setTimeout(() => mkBell(659.25, 4), 120); // E5
    setTimeout(() => mkBell(783.99, -3), 260); // G5
  }, [ensure]);

  // A softer airy ping (break end)
  const playBreakEnd = useCallback(() => {
    const ctx = ensure();
    if (ctx.state === 'suspended') ctx.resume();
    const out = ctx.createGain();
    out.gain.value = 0.10;
    out.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = 660; // soft ping
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 200;
    osc.connect(gain).connect(hp).connect(out);
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc.start(now);
    osc.stop(now + 1.25);
    nodesRef.current.push(osc, gain, hp);
  }, [ensure]);

  return { playWorkEnd, playBreakEnd, stopAll };
}

type Mode = 'idle' | 'work' | 'workDone' | 'break' | 'breakDone';

export default function App() {
  const [minutes, setMinutes] = useState<number>(20);
  const [target, setTarget] = useState<number | null>(null);
  const [now, setNow] = useState(() => performance.now());
  const [mode, setMode] = useState<Mode>('idle');
  const { playWorkEnd, playBreakEnd, stopAll } = useChimes();
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
  const remaining = target ? Math.max(0, target - now) : (mode === 'breakDone' || mode === 'workDone' ? 0 : baseMs);
  const running = !!target && remaining > 0 && (mode === 'work' || mode === 'break');

  // Transition when timers end
  useEffect(() => {
    if (!target) return;
    if (remaining > 0) return;
    if (mode === 'work') {
      setTarget(null);
      setMode('workDone');
      playWorkEnd();
    } else if (mode === 'break') {
      setTarget(null);
      setMode('breakDone');
      playBreakEnd();
    }
  }, [remaining, target, mode, playWorkEnd, playBreakEnd]);

  const startWork = useCallback(() => {
    const duration = baseMs;
    if (duration <= 0) return;
    setTarget(performance.now() + duration);
    setMode('work');
  }, [baseMs]);

  const startBreak = useCallback(() => {
    const duration = 23_000; // 23 seconds
    setTarget(performance.now() + duration);
    setMode('break');
  }, []);

  const restartAfterBreak = useCallback(() => {
    stopAll();
    setTarget(performance.now() + baseMs);
    setMode('work');
  }, [baseMs, stopAll]);

  const stopAllFlow = useCallback(() => {
    stopAll();
    setTarget(null);
    setMode('idle');
  }, [stopAll]);

  // Enter to continue from workDone → break
  useEffect(() => {
    if (mode !== 'workDone') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') startBreak();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, startBreak]);

  // Space to start when idle, but ignore if typing in inputs/buttons
  useEffect(() => {
    if (mode !== 'idle') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== ' ') return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isInteractive = tag === 'input' || tag === 'button' || target?.isContentEditable;
      if (isInteractive) return;
      e.preventDefault();
      startWork();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, startWork]);

  return (
    <div className="relative h-screen overflow-hidden flex items-center justify-center p-8 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Ambient colorful clouds */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-cyan-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-32 h-96 w-96 rounded-full bg-indigo-500/25 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -left-20 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />

      <div className={`relative z-10 w-full max-w-md rounded-3xl bg-white/5 backdrop-blur-xl shadow-[0_30px_80px_rgba(0,0,0,0.6)] p-8 border border-white/10 ${mode === 'workDone' || mode === 'breakDone' ? 'ring-2 ring-cyan-400/30' : ''}`}>
        <h1 className="text-3xl font-semibold tracking-tight mb-6 bg-gradient-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent">20 20 20 timer</h1>

        <form className="space-y-5 mb-8" onSubmit={(e) => { e.preventDefault(); startWork(); }}>
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
            disabled={mode !== 'idle'}
          >
            {mode === 'work' ? 'Running…' : 'Start'}
          </button>
        </form>

        <div className="text-center select-none">
          <div className="inline-block rounded-2xl px-5 py-2 bg-white/5 border border-white/10 backdrop-blur-md">
            <div className="text-7xl md:text-8xl font-semibold tracking-tight tabular-nums font-mono text-sky-100 drop-shadow-[0_0_24px_rgba(125,200,255,0.25)] select-none">
            {formatTime(remaining)}
            </div>
          </div>
        </div>

        {mode === 'workDone' && (
          <div className="mt-10 flex flex-col items-center gap-4">
            <div className="text-white/85 text-sm">Time's up. Press Continue (or Enter) for a 23s break.</div>
            <button
              onClick={startBreak}
              className="h-12 px-7 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 hover:from-sky-400 hover:to-cyan-300 text-slate-900 font-semibold shadow-lg shadow-cyan-500/30 transition"
            >
              Continue
            </button>
          </div>
        )}

        {mode === 'breakDone' && (
          <div className="mt-10 flex flex-col items-center gap-4">
            <div className="text-white/85 text-sm">Break finished.</div>
            <div className="flex gap-3">
              <button
                onClick={restartAfterBreak}
                className="h-12 px-6 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 hover:from-sky-400 hover:to-cyan-300 text-slate-900 font-semibold shadow-lg shadow-cyan-500/30 transition"
              >
                Restart
              </button>
              <button
                onClick={stopAllFlow}
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
