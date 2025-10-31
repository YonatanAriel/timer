import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Contract:
// Inputs: minutes:number only
// Behavior: countdown, calm music + buttons when done; Restart restarts, Stop just stops

function formatTime(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(String(h).padStart(2, "0"));
  parts.push(String(m).padStart(2, "0"));
  parts.push(String(s).padStart(2, "0"));
  return parts.join(":");
}

// Soft, calm chimes (two variants) using WebAudio. No harsh tones.
function useChimes() {
  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<Array<AudioNode>>([]);
  const timersRef = useRef<number[]>([]);

  const ensure = useCallback(() => {
    if (!ctxRef.current)
      ctxRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    return ctxRef.current!;
  }, []);

  const stopAll = useCallback(() => {
    const ctx = ensure();
    const now = ctx.currentTime;
    // Clear any timers (intervals/timeouts)
    timersRef.current.forEach((id) => {
      clearInterval(id as any);
      clearTimeout(id as any);
    });
    timersRef.current = [];
    nodesRef.current.forEach((n) => {
      try {
        if ("gain" in (n as any)) {
          const g = (n as any).gain as GainNode["gain"];
          g.cancelScheduledValues(now);
          g.setValueAtTime((g as any).value ?? 0.001, now);
          g.linearRampToValueAtTime(0.0001, now + 0.25);
        }
        if ("stop" in (n as any)) (n as any).stop(now + 0.3);
      } catch {}
    });
    nodesRef.current = [];
  }, [ensure]);

  // A gentle bell-like triad (work end)
  const playWorkEndSynth = useCallback(() => {
    const ctx = ensure();
    if (ctx.state === "suspended") ctx.resume();
    const out = ctx.createGain();
    out.gain.value = 0.18; // slightly louder but still calm
    out.connect(ctx.destination);

    const mkBell = (freq: number, startAt: number, dur = 1.6, amp = 0.35) => {
      const carrier = ctx.createOscillator();
      carrier.type = "sine";
      carrier.frequency.value = freq;
      const gain = ctx.createGain();
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 3600;
      gain.gain.value = 0.0001;
      carrier.connect(gain).connect(lp).connect(out);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.linearRampToValueAtTime(amp, startAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + dur);
      carrier.start(startAt);
      carrier.stop(startAt + dur + 0.05);
      nodesRef.current.push(carrier, gain, lp);
    };
    const now = ctx.currentTime;
    // C5, E5, G5 arpeggio on the audio clock (no setTimeout jitter)
    mkBell(523.25, now);
    mkBell(659.25, now + 0.14);
    mkBell(783.99, now + 0.28);
    nodesRef.current.push(out);
  }, [ensure]);

  // A softer airy ping (break end) — fallback if stream fails
  const playBreakEndSynth = useCallback(() => {
    const ctx = ensure();
    if (ctx.state === "suspended") ctx.resume();
    const out = ctx.createGain();
    out.gain.value = 0.14;
    out.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = 660; // soft ping
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 200;
    osc.connect(gain).connect(hp).connect(out);
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc.start(now);
    osc.stop(now + 1.25);
    nodesRef.current.push(osc, gain, hp, out);
  }, [ensure]);

  // Local-only playback via WebAudio (no network/CORS)
  const playWorkEnd = useCallback(() => {
    // Stop previous loops if any
    stopAll();
    // Start a gentle repeating arpeggio every ~3s until stopped
    playWorkEndSynth();
    const id = window.setInterval(() => {
      try {
        playWorkEndSynth();
      } catch {}
    }, 3000);
    timersRef.current.push(id as unknown as number);
  }, [playWorkEndSynth, stopAll]);

  const playBreakEnd = useCallback(() => {
    // Stop previous loops if any
    stopAll();
    // Soft ping every ~2.5s until stopped
    playBreakEndSynth();
    const id = window.setInterval(() => {
      try {
        playBreakEndSynth();
      } catch {}
    }, 2500);
    timersRef.current.push(id as unknown as number);
  }, [playBreakEndSynth, stopAll]);

  // Play the break-end ping twice, then invoke a callback (used for auto-restart)
  const playBreakEndTwiceThen = useCallback(
    (then: () => void) => {
      stopAll();
      playBreakEndSynth();
      const t1 = window.setTimeout(() => {
        try {
          playBreakEndSynth();
        } catch {}
      }, 600);
      const t2 = window.setTimeout(() => {
        try {
          then();
        } catch {}
      }, 1600);
      timersRef.current.push(t1 as unknown as number, t2 as unknown as number);
    },
    [playBreakEndSynth, stopAll]
  );

  return { playWorkEnd, playBreakEnd, playBreakEndTwiceThen, stopAll };
}

type Mode = "idle" | "work" | "workDone" | "break" | "breakDone";

export default function App() {
  // Keep a string so the user can clear the field (no forced 0)
  const [minutesInput, setMinutesInput] = useState<string>("20");
  const [target, setTarget] = useState<number | null>(null);
  const [now, setNow] = useState(() => performance.now());
  const [mode, setMode] = useState<Mode>("idle");
  const { playWorkEnd, playBreakEnd, playBreakEndTwiceThen, stopAll } =
    useChimes();
  const minutesRef = useRef<HTMLInputElement | null>(null);
  const continueBtnRef = useRef<HTMLButtonElement | null>(null);
  const incMinutes = useCallback(() => {
    let n = parseInt(minutesInput || "0", 10);
    if (Number.isNaN(n)) n = 0;
    n = Math.min(59, n + 1);
    setMinutesInput(String(n));
    requestAnimationFrame(() => {
      minutesRef.current?.focus();
      minutesRef.current?.select();
    });
  }, [minutesInput]);
  const decMinutes = useCallback(() => {
    let n = parseInt(minutesInput || "0", 10);
    if (Number.isNaN(n)) n = 0;
    n = Math.max(0, n - 1);
    setMinutesInput(String(n));
    requestAnimationFrame(() => {
      minutesRef.current?.focus();
      minutesRef.current?.select();
    });
  }, [minutesInput]);

  // Auto-focus and select the minutes field on launch
  useEffect(() => {
    // next tick to ensure element is mounted
    const t = setTimeout(() => {
      minutesRef.current?.focus();
      minutesRef.current?.select();
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // Auto-start 20 minutes timer on app initialization
  useEffect(() => {
    const timer = setTimeout(() => {
      setTarget(performance.now() + 20 * 60_000); // 20 minutes in milliseconds
      setMode("work");
    }, 0);
    return () => clearTimeout(timer);
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

  const minutes = useMemo(() => {
    const n = parseInt(minutesInput, 10);
    if (Number.isNaN(n)) return 0;
    return Math.max(0, Math.min(59, n));
  }, [minutesInput]);
  const baseMs = useMemo(() => Math.max(0, minutes) * 60_000, [minutes]);
  const remaining = target
    ? Math.max(0, target - now)
    : mode === "breakDone" || mode === "workDone"
    ? 0
    : baseMs;
  const running =
    !!target && remaining > 0 && (mode === "work" || mode === "break");

  // Transition when timers end
  useEffect(() => {
    if (!target) return;
    if (remaining > 0) return;
    if (mode === "work") {
      setTarget(null);
      setMode("workDone");
      playWorkEnd();
    } else if (mode === "break") {
      setTarget(null);
      // Play the sound twice, then auto-restart work (no button)
      playBreakEndTwiceThen(() => {
        setTarget(performance.now() + baseMs);
        setMode("work");
        requestAnimationFrame(() => {
          minutesRef.current?.focus();
          minutesRef.current?.select();
        });
      });
    }
  }, [remaining, target, mode, playWorkEnd, playBreakEndTwiceThen, baseMs]);

  const startWork = useCallback(() => {
    stopAll();
    const duration = baseMs;
    if (duration <= 0) return;
    setTarget(performance.now() + duration);
    setMode("work");
    // Keep focus on the field and select the value
    requestAnimationFrame(() => {
      minutesRef.current?.focus();
      minutesRef.current?.select();
    });
  }, [baseMs]);

  const restartWork = useCallback(() => {
    stopAll();
    const duration = baseMs;
    if (duration <= 0) return;
    setTarget(performance.now() + duration);
    setMode("work");
    requestAnimationFrame(() => {
      minutesRef.current?.focus();
      minutesRef.current?.select();
    });
  }, [baseMs]);

  const startBreak = useCallback(() => {
    stopAll();
    const duration = 23_000; // 23 seconds
    setTarget(performance.now() + duration);
    setMode("break");
  }, [stopAll]);

  const restartAfterBreak = useCallback(() => {
    stopAll();
    setTarget(performance.now() + baseMs);
    setMode("work");
    requestAnimationFrame(() => {
      minutesRef.current?.focus();
      minutesRef.current?.select();
    });
  }, [baseMs, stopAll]);

  const stopAllFlow = useCallback(() => {
    stopAll();
    setTarget(null);
    setMode("idle");
    // Return focus to input and select its text
    requestAnimationFrame(() => {
      minutesRef.current?.focus();
      minutesRef.current?.select();
    });
  }, [stopAll]);

  // Enter to continue from workDone → break; also focus the Continue button
  useEffect(() => {
    if (mode !== "workDone") return;
    // Focus the Continue button so Enter activates it
    requestAnimationFrame(() => {
      continueBtnRef.current?.focus();
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") startBreak();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, startBreak]);

  // Enter to update the running timer with the new minutes when in work
  useEffect(() => {
    if (mode !== "work") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        restartWork();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, restartWork]);

  // Space to start when idle, but ignore if typing in inputs/buttons
  useEffect(() => {
    if (mode !== "idle") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== " ") return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isInteractive =
        tag === "input" || tag === "button" || target?.isContentEditable;
      if (isInteractive) return;
      e.preventDefault();
      startWork();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, startWork]);

  // Keep input focused/selected when breakDone UI appears
  useEffect(() => {
    if (mode !== "breakDone") return;
    requestAnimationFrame(() => {
      minutesRef.current?.focus();
      minutesRef.current?.select();
    });
  }, [mode]);

  return (
    <div className="relative flex items-center justify-center h-screen p-8 overflow-hidden bg-gradient-to-b from-emerald-50 via-emerald-100 to-emerald-50 text-slate-800">
      {/* No external audio elements needed; sounds are generated locally via WebAudio */}
      {/* Ambient colorful clouds */}
      <div className="absolute rounded-full pointer-events-none -top-24 -right-24 h-80 w-80 bg-emerald-300/30 blur-3xl" />
      <div className="absolute rounded-full pointer-events-none -bottom-28 -left-32 h-96 w-96 bg-lime-300/30 blur-3xl" />
      <div className="absolute rounded-full pointer-events-none top-1/3 -left-20 h-72 w-72 bg-teal-300/20 blur-3xl" />

      <div
        className={`relative z-10 w-full max-w-md rounded-3xl bg-white/70 backdrop-blur-xl shadow-[0_30px_80px_rgba(0,0,0,0.15)] p-8 border border-emerald-200 ${
          mode === "workDone" || mode === "breakDone"
            ? "ring-2 ring-emerald-400/40"
            : ""
        }`}
      >
        <h1 className="mb-6 text-3xl font-semibold tracking-tight text-transparent bg-gradient-to-r from-emerald-600 to-lime-500 bg-clip-text">
          20 20 20 timer
        </h1>

        <form
          className="mb-8 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (mode === "work") restartWork();
            else startWork(); // allow Start in idle, break, workDone, breakDone
          }}
        >
          <div className="relative">
            <label className="block mb-1 text-xs text-emerald-600">
              Minutes
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={59}
              value={minutesInput}
              onChange={(e) => {
                // Allow empty while typing; strip non-digits and limit to 2 chars
                const raw = e.target.value;
                const digits = raw.replace(/\D+/g, "").slice(0, 2);
                setMinutesInput(digits);
              }}
              onBlur={() => {
                // Normalize on blur
                const n = parseInt(minutesInput, 10);
                if (Number.isNaN(n)) return setMinutesInput("");
                const clamped = Math.max(0, Math.min(59, n));
                setMinutesInput(String(clamped));
              }}
              ref={minutesRef}
              className="w-full h-12 pl-4 bg-white border appearance-none rounded-2xl border-emerald-200 pr-14 text-emerald-700 caret-emerald-600 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
              style={{
                WebkitAppearance: "none" as any,
                MozAppearance: "textfield" as any,
              }}
              placeholder="20"
            />
            {/* Custom green increment/decrement controls */}
            <div className="absolute flex flex-col h-8 overflow-hidden bg-white border rounded-lg shadow-sm right-2 top-1/2 -translate-y-1/5 w-9 border-emerald-300">
              <button
                type="button"
                onClick={incMinutes}
                aria-label="Increase minutes"
                className="flex-1 flex items-center justify-center bg-gradient-to-r from-emerald-500 to-lime-400 hover:from-emerald-400 hover:to-lime-300 text-white text-[10px] leading-none cursor-pointer"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={decMinutes}
                aria-label="Decrease minutes"
                className="flex-1 flex items-center justify-center bg-gradient-to-r from-emerald-500 to-lime-400 hover:from-emerald-400 hover:to-lime-300 text-white text-[10px] leading-none cursor-pointer"
              >
                ▼
              </button>
            </div>
          </div>
          <button
            type="submit"
            className="w-full h-12 font-semibold text-white transition shadow-lg cursor-pointer rounded-2xl bg-gradient-to-r from-emerald-500 to-lime-400 hover:from-emerald-400 hover:to-lime-300 shadow-emerald-400/25"
            disabled={false}
            title={
              mode === "work"
                ? "Click to apply the new minutes"
                : "Start the timer"
            }
          >
            {mode === "work" ? "Running…" : "Start"}
          </button>
        </form>

        <div className="text-center select-none">
          <div className="inline-block px-5 py-2 border rounded-2xl bg-white/70 border-emerald-200 backdrop-blur-md">
            <div className="text-7xl md:text-8xl font-semibold tracking-tight tabular-nums font-mono text-emerald-700 drop-shadow-[0_0_24px_rgba(16,185,129,0.25)] select-none">
              {formatTime(remaining)}
            </div>
          </div>
        </div>

        {mode === "workDone" && (
          <div className="flex flex-col items-center gap-4 mt-10">
            <div className="flex gap-3">
              <button
                onClick={startBreak}
                ref={continueBtnRef}
                autoFocus
                className="h-12 font-semibold transition shadow-lg cursor-pointer px-7 rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 hover:from-emerald-400 hover:to-lime-300 text-slate-900 shadow-emerald-500/30"
              >
                Continue
              </button>
              <button
                onClick={stopAllFlow}
                className="h-12 px-6 transition border cursor-pointer rounded-xl bg-white/70 hover:bg-white border-emerald-200 text-slate-800"
              >
                Stop
              </button>
            </div>
          </div>
        )}

        {mode === "breakDone" && (
          <div className="flex flex-col items-center gap-4 mt-10">
            <div className="flex gap-3">
              <button
                onClick={restartAfterBreak}
                className="h-12 px-6 font-semibold transition shadow-lg cursor-pointer rounded-xl bg-gradient-to-r from-emerald-500 to-lime-400 hover:from-emerald-400 hover:to-lime-300 text-slate-900 shadow-emerald-500/30"
              >
                Restart
              </button>
              <button
                onClick={stopAllFlow}
                className="h-12 px-6 transition border cursor-pointer rounded-xl bg-white/70 hover:bg-white border-emerald-200 text-slate-800"
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
