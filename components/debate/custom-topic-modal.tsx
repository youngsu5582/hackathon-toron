"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { DebateTopic } from "@/lib/debate-topics";

interface CustomTopicModalProps {
  onSubmit: (topic: DebateTopic) => void;
  onClose: () => void;
}

export function CustomTopicModal({ onSubmit, onClose }: CustomTopicModalProps) {
  const [title, setTitle] = useState("");
  const [sideA, setSideA] = useState("");
  const [sideB, setSideB] = useState("");

  const isValid = title.trim() && sideA.trim() && sideB.trim();

  const handleSubmit = () => {
    if (!isValid) return;
    onSubmit({
      id: `custom-${Date.now()}`,
      title: title.trim(),
      description: "사용자 지정 토론 주제",
      sideA: { label: sideA.trim(), emoji: "🔵" },
      sideB: { label: sideB.trim(), emoji: "🔴" },
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="커스텀 주제 입력"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md animate-fade-in-scale"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl p-7 animate-fade-in-scale">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/50 border border-border/50 text-xs text-muted-foreground font-mono mb-4">
            &#9878; 커스텀 주제
          </div>
          <h2 className="font-mono text-lg font-bold">나만의 토론 주제</h2>
          <p className="text-sm text-muted-foreground mt-1">
            원하는 기술 논쟁을 직접 설정하세요
          </p>
        </div>

        <div className="space-y-4">
          {/* Topic title */}
          <div>
            <label className="block text-xs font-mono text-muted-foreground mb-1.5">
              토론 주제
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: Vim vs VSCode"
              className={cn(
                "w-full rounded-lg border border-border/60 bg-background/50 px-3 py-2.5",
                "font-mono text-sm placeholder:text-muted-foreground/40",
                "focus:outline-none focus:ring-2 focus:ring-[var(--debate-gold)]/30 focus:border-[var(--debate-gold)]/40",
                "transition-all duration-200"
              )}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && isValid && handleSubmit()}
            />
          </div>

          {/* Sides */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-[var(--debate-blue)] mb-1.5">
                A 진영
              </label>
              <input
                type="text"
                value={sideA}
                onChange={(e) => setSideA(e.target.value)}
                placeholder="예: Vim 찬성"
                className={cn(
                  "w-full rounded-lg border border-[var(--debate-blue)]/20 bg-[var(--debate-blue)]/5 px-3 py-2.5",
                  "font-mono text-sm placeholder:text-muted-foreground/40",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--debate-blue)]/30",
                  "transition-all duration-200"
                )}
                onKeyDown={(e) => e.key === "Enter" && isValid && handleSubmit()}
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-[var(--debate-red)] mb-1.5">
                B 진영
              </label>
              <input
                type="text"
                value={sideB}
                onChange={(e) => setSideB(e.target.value)}
                placeholder="예: VSCode 찬성"
                className={cn(
                  "w-full rounded-lg border border-[var(--debate-red)]/20 bg-[var(--debate-red)]/5 px-3 py-2.5",
                  "font-mono text-sm placeholder:text-muted-foreground/40",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--debate-red)]/30",
                  "transition-all duration-200"
                )}
                onKeyDown={(e) => e.key === "Enter" && isValid && handleSubmit()}
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className={cn(
            "mt-6 w-full rounded-lg py-2.5 font-mono text-sm font-semibold",
            "border transition-all duration-200",
            isValid
              ? "border-[var(--debate-gold)]/40 bg-[var(--debate-gold)]/10 text-[var(--debate-gold)] hover:bg-[var(--debate-gold)]/20 active:scale-[0.98]"
              : "border-border/30 bg-muted/20 text-muted-foreground/40 cursor-not-allowed"
          )}
        >
          토론 시작
        </button>

        <button
          onClick={onClose}
          className="mt-3 w-full text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors py-1"
        >
          &larr; 다른 주제 선택
        </button>
      </div>
    </div>
  );
}
