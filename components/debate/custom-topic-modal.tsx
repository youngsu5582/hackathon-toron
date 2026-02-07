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
        className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-fade-in-scale"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-border/40 bg-card/90 backdrop-blur-2xl p-8 animate-fade-in-scale shadow-2xl shadow-black/40">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--debate-gold)]/5 border border-[var(--debate-gold)]/15 text-xs text-[var(--debate-gold)]/80 font-mono mb-5">
            &#10133; 커스텀 주제
          </div>
          <h2 className="font-mono text-xl font-bold">나만의 토론 주제</h2>
          <p className="text-sm text-muted-foreground/60 mt-2">
            원하는 토론 주제를 직접 설정하세요
          </p>
        </div>

        <div className="space-y-5">
          {/* Topic title */}
          <div>
            <label className="block text-xs font-mono text-muted-foreground/70 mb-2">
              토론 주제
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: Vim vs VSCode, 탕수육 부먹 vs 찍먹"
              className={cn(
                "w-full rounded-xl border border-border/40 bg-background/60 px-4 py-3",
                "font-mono text-sm placeholder:text-muted-foreground/30",
                "focus:outline-none focus:ring-2 focus:ring-[var(--debate-gold)]/25 focus:border-[var(--debate-gold)]/30",
                "transition-all duration-200"
              )}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && isValid && handleSubmit()}
            />
          </div>

          {/* Sides */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-[var(--debate-blue)]/80 mb-2">
                A 진영
              </label>
              <input
                type="text"
                value={sideA}
                onChange={(e) => setSideA(e.target.value)}
                placeholder="예: Vim 찬성"
                className={cn(
                  "w-full rounded-xl border border-[var(--debate-blue)]/15 bg-[var(--debate-blue)]/[0.03] px-4 py-3",
                  "font-mono text-sm placeholder:text-muted-foreground/30",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--debate-blue)]/25",
                  "transition-all duration-200"
                )}
                onKeyDown={(e) => e.key === "Enter" && isValid && handleSubmit()}
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-[var(--debate-red)]/80 mb-2">
                B 진영
              </label>
              <input
                type="text"
                value={sideB}
                onChange={(e) => setSideB(e.target.value)}
                placeholder="예: VSCode 찬성"
                className={cn(
                  "w-full rounded-xl border border-[var(--debate-red)]/15 bg-[var(--debate-red)]/[0.03] px-4 py-3",
                  "font-mono text-sm placeholder:text-muted-foreground/30",
                  "focus:outline-none focus:ring-2 focus:ring-[var(--debate-red)]/25",
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
            "mt-8 w-full rounded-xl py-3 font-mono text-sm font-bold",
            "border transition-all duration-300",
            isValid
              ? "border-[var(--debate-gold)]/30 bg-[var(--debate-gold)]/10 text-[var(--debate-gold)] hover:bg-[var(--debate-gold)]/20 hover:shadow-lg hover:shadow-[var(--debate-gold)]/5 active:scale-[0.98]"
              : "border-border/20 bg-muted/10 text-muted-foreground/30 cursor-not-allowed"
          )}
        >
          토론 시작
        </button>

        <button
          onClick={onClose}
          className="mt-3 w-full text-sm text-muted-foreground/50 hover:text-muted-foreground transition-colors py-2 rounded-lg hover:bg-muted/20"
        >
          &larr; 다른 주제 선택
        </button>
      </div>
    </div>
  );
}
