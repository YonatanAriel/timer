import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Contract:
// Inputs: hours:number, minutes:number
// Behavior: countdown, calm sound + button when done; clicking button stops sound and restarts countdown

type Inputs = { hours: number; minutes: number };

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

function useAudioTone() {
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<{ osc: OscillatorNode; gain: GainNode } | null>(null);

  const ensure = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return ctxRef.current!;
  }, []);

  const start = useCallback(() => {
    const ctx = ensure();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 528; // calm tone
    gain.gain.value = 0.001; // start very low
    osc.connect(gain).connect(ctx.destination);
    osc.start();

    // gentle fade in
    const g = gain.gain;
    const now = ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0.02, now + 1.2);

    nodesRef.current = { osc, gain };
  }, [ensure]);

  const stop = useCallback(() => {
    const ctx = ensure();
    const nodes = nodesRef.current;
    if (!nodes) return;
    const now = ctx.currentTime;
    nodes.gain.gain.cancelScheduledValues(now);
    nodes.gain.gain.setValueAtTime(nodes.gain.gain.value, now);
    nodes.gain.gain.linearRampToValueAtTime(0.0001, now + 0.5);
    nodes.osc.stop(now + 0.55);
    nodesRef.current = null;
  }, [ensure]);

  return { start, stop };
}

export default function App() {
  const [inputs, setInputs] = useState<Inputs>({ hours: 0, minutes: 20 });
  const [target, setTarget] = useState<number | null>(null);
  const [now, setNow] = useState(() => performance.now());
  const [ringing, setRinging] = useState(false);
  const { start: startTone, stop: stopTone } = useAudioTone();

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

  const baseMs = useMemo(() => (inputs.hours * 60 + inputs.minutes) * 60_000, [inputs]);
  const remaining = target ? Math.max(0, target - now) : baseMs;
  const running = !!target && remaining > 0 && !ringing;

  useEffect(() => {
    if (!target) return;
    if (remaining <= 0 && !ringing) {
      setRinging(true);
      // attempt to resume audio context on user gesture edge cases
      startTone();
    }
  }, [remaining, target, ringing, startTone]);

  const startTimer = useCallback(() => {
    const duration = baseMs;
    if (duration <= 0) return;
    setTarget(performance.now() + duration);
    setRinging(false);
  }, [baseMs]);

  const stopRingingAndRestart = useCallback(() => {
    stopTone();
    // restart from the beginning using the latest inputs
    setRinging(false);
    setTarget(performance.now() + baseMs);
  }, [baseMs, stopTone]);

  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl bg-card shadow-card p-6 border border-white/5">
        <h1 className="text-2xl font-semibold tracking-tight mb-6 text-white/90">Calm Timer</h1>

        <form
          className="grid grid-cols-2 gap-4 mb-6"
          onSubmit={(e) => { e.preventDefault(); startTimer(); }}
        >
          <div>
            <label className="block text-xs text-white/60 mb-1">Hours</label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={999}
              value={inputs.hours}
              onChange={(e) => setInputs((s) => ({ ...s, hours: Math.max(0, Math.min(999, Number(e.target.value)||0)) }))}
              className="w-full rounded-lg bg-surface/80 border border-white/10 px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-accent/60"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-xs text-white/60 mb-1">Minutes</label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={59}
              value={inputs.minutes}
              onChange={(e) => setInputs((s) => ({ ...s, minutes: Math.max(0, Math.min(59, Number(e.target.value)||0)) }))}
              className="w-full rounded-lg bg-surface/80 border border-white/10 px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-accent/60"
              placeholder="0"
            />
          </div>
          <button
            type="submit"
            className="col-span-2 h-11 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition text-white/90"
            disabled={ringing}
          >
            {running ? 'Running…' : 'Start'}
          </button>
        </form>

        <div className="text-center">
          <div className="text-6xl font-semibold tracking-tight tabular-nums text-calm drop-shadow-[0_0_20px_rgba(124,196,255,0.25)] select-none">
            {formatTime(remaining)}
          </div>
        </div>

        {ringing && (
          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="text-white/80">Time's up. Breathe in… breathe out.</div>
            <button
              onClick={stopRingingAndRestart}
              className="h-11 px-4 rounded-lg bg-accent/20 hover:bg-accent/30 text-white border border-accent/30 transition"
            >
              Restart
            </button>
          </div>
        )}

        <footer className="mt-8 text-center text-xs text-white/40">Windows 11-ready • Electron + React</footer>
      </div>
    </div>
  );
}
