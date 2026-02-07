"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface VSScreenProps {
  userSide: string;
  agentSide: string;
  userEmoji: string;
  agentEmoji: string;
  onComplete: () => void;
}

export function VSScreen({
  userSide,
  agentSide,
  userEmoji,
  agentEmoji,
  onComplete,
}: VSScreenProps) {
  const [phase, setPhase] = useState<
    "enter" | "vs" | "countdown" | "exit"
  >("enter");
  const [count, setCount] = useState(3);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    // Phase: sides slide in
    timers.push(setTimeout(() => setPhase("vs"), 600));

    // Phase: VS impact
    timers.push(setTimeout(() => setPhase("countdown"), 1400));

    // Countdown 3 -> 2 -> 1
    timers.push(setTimeout(() => setCount(2), 2200));
    timers.push(setTimeout(() => setCount(1), 3000));

    // Exit
    timers.push(setTimeout(() => setPhase("exit"), 3600));

    // Complete
    timers.push(setTimeout(() => onComplete(), 4000));

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[60] flex items-center justify-center overflow-hidden",
        "bg-black/95 backdrop-blur-sm",
        phase === "exit" && "animate-vs-exit"
      )}
    >
      {/* Radial glow background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,oklch(0.3_0.05_250/0.3)_0%,transparent_70%)]" />

      {/* Spark lines */}
      {phase !== "enter" && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="vs-spark-line vs-spark-1" />
          <div className="vs-spark-line vs-spark-2" />
          <div className="vs-spark-line vs-spark-3" />
        </div>
      )}

      {/* Left side - User */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1/2 flex flex-col items-center justify-center",
          "transition-all duration-500 ease-out",
          phase === "enter"
            ? "-translate-x-full opacity-0"
            : "translate-x-0 opacity-100"
        )}
      >
        <div className="relative">
          <div
            className={cn(
              "absolute -inset-8 rounded-full blur-3xl transition-opacity duration-700",
              "bg-[var(--debate-blue)]/20",
              phase === "enter" ? "opacity-0" : "opacity-100"
            )}
          />
          <div className="text-7xl sm:text-8xl relative z-10 animate-vs-float">
            {userEmoji}
          </div>
        </div>
        <div className="mt-6 font-mono text-lg sm:text-xl font-bold text-[var(--debate-blue)] relative z-10">
          {userSide}
        </div>
        <div className="mt-1 text-xs text-muted-foreground/60 font-mono">
          CHALLENGER
        </div>
      </div>

      {/* Right side - Agent */}
      <div
        className={cn(
          "absolute right-0 top-0 bottom-0 w-1/2 flex flex-col items-center justify-center",
          "transition-all duration-500 ease-out",
          phase === "enter"
            ? "translate-x-full opacity-0"
            : "translate-x-0 opacity-100"
        )}
      >
        <div className="relative">
          <div
            className={cn(
              "absolute -inset-8 rounded-full blur-3xl transition-opacity duration-700",
              "bg-[var(--debate-red)]/20",
              phase === "enter" ? "opacity-0" : "opacity-100"
            )}
          />
          <div className="text-7xl sm:text-8xl relative z-10 animate-vs-float-reverse">
            {agentEmoji}
          </div>
        </div>
        <div className="mt-6 font-mono text-lg sm:text-xl font-bold text-[var(--debate-red)] relative z-10">
          {agentSide}
        </div>
        <div className="mt-1 text-xs text-muted-foreground/60 font-mono">
          TECH ASSASSIN
        </div>
      </div>

      {/* Center divider line */}
      <div
        className={cn(
          "absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2",
          "bg-gradient-to-b from-transparent via-white/20 to-transparent",
          "transition-opacity duration-300",
          phase === "enter" ? "opacity-0" : "opacity-100"
        )}
      />

      {/* VS badge */}
      {(phase === "vs" || phase === "countdown" || phase === "exit") && (
        <div className="relative z-20 flex flex-col items-center">
          <div className="animate-vs-impact">
            <div className="relative">
              <div className="absolute -inset-4 rounded-full bg-[var(--debate-gold)]/20 blur-xl animate-pulse" />
              <span className="font-mono text-5xl sm:text-7xl font-black text-[var(--debate-gold)] relative z-10 vs-text-shadow">
                VS
              </span>
            </div>
          </div>

          {/* Countdown */}
          {phase === "countdown" && (
            <div className="mt-6 animate-vs-countdown" key={count}>
              <span className="font-mono text-3xl font-bold text-white/80">
                {count}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Bottom topic label */}
      <div
        className={cn(
          "absolute bottom-12 left-0 right-0 text-center",
          "transition-all duration-500 delay-300",
          phase === "enter"
            ? "opacity-0 translate-y-4"
            : "opacity-100 translate-y-0"
        )}
      >
        <span className="font-mono text-xs text-muted-foreground/40 tracking-widest uppercase">
          Architecture Court
        </span>
      </div>
    </div>
  );
}
