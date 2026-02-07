"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { DebateTurnData } from "@/lib/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AiBattleViewProps {
  turns: DebateTurnData[];
  isRunning: boolean;
  currentSide?: string;
  sideALabel: string;
  sideBLabel: string;
}

export function AiBattleView({
  turns,
  isRunning,
  currentSide,
  sideALabel,
  sideBLabel,
}: AiBattleViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns.length]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {turns.map((turn) => {
        const isAlpha = turn.side === "sideA";
        const persona = isAlpha ? "알파" : "오메가";
        const emoji = isAlpha ? "\u26A1" : "\uD83D\uDD25";
        const sideLabel = isAlpha ? sideALabel : sideBLabel;

        return (
          <div
            key={turn.id}
            className={cn(
              "animate-fade-in-up",
              isAlpha ? "pr-8" : "pl-8"
            )}
          >
            {/* Header */}
            <div
              className={cn(
                "flex items-center gap-2 mb-2",
                isAlpha ? "justify-start" : "justify-end"
              )}
            >
              <div
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold",
                  isAlpha
                    ? "bg-[var(--debate-blue)]/15 text-[var(--debate-blue)]"
                    : "bg-[var(--debate-red)]/15 text-[var(--debate-red)]"
                )}
              >
                <span>{emoji}</span>
                <span>{persona}</span>
              </div>
              <span className="text-[10px] text-muted-foreground/50 font-mono">
                {sideLabel} | R{turn.turnNumber}
              </span>
            </div>

            {/* Message bubble */}
            <div
              className={cn(
                "rounded-xl border p-4 backdrop-blur-sm",
                isAlpha
                  ? "border-[var(--debate-blue)]/30 bg-[var(--debate-blue)]/5"
                  : "border-[var(--debate-red)]/30 bg-[var(--debate-red)]/5"
              )}
            >
              <div className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {turn.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        );
      })}

      {/* Loading indicator for next turn */}
      {isRunning && (
        <div
          className={cn(
            "animate-fade-in-up",
            currentSide === "sideA" ? "pr-8" : "pl-8"
          )}
        >
          <div
            className={cn(
              "flex items-center gap-2 mb-2",
              currentSide === "sideA" ? "justify-start" : "justify-end"
            )}
          >
            <div
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold animate-pulse",
                currentSide === "sideA"
                  ? "bg-[var(--debate-blue)]/15 text-[var(--debate-blue)]"
                  : "bg-[var(--debate-red)]/15 text-[var(--debate-red)]"
              )}
            >
              <span>{currentSide === "sideA" ? "\u26A1" : "\uD83D\uDD25"}</span>
              <span>
                {currentSide === "sideA" ? "알파" : "오메가"} 준비 중...
              </span>
            </div>
          </div>
          <div
            className={cn(
              "rounded-xl border border-dashed p-6 flex items-center",
              currentSide === "sideA"
                ? "border-[var(--debate-blue)]/20 justify-start"
                : "border-[var(--debate-red)]/20 justify-end"
            )}
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground/50">
              <div className="flex gap-1">
                <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
              </div>
              <span className="font-mono text-xs">반론 작성 중</span>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {turns.length === 0 && !isRunning && (
        <div className="text-center py-12 text-muted-foreground/50">
          <div className="text-3xl mb-3">{"\u26A1"} vs {"\uD83D\uDD25"}</div>
          <p className="font-mono text-sm">AI 배틀 대기 중...</p>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
