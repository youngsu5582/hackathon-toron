"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface UserVerdictFormProps {
  conversationId: string;
  sideALabel: string;
  sideBLabel: string;
  onSubmitted?: (verdict: string) => void;
}

const CRITERIA = [
  { key: "tech", label: "기술적 깊이" },
  { key: "evidence", label: "근거 품질" },
  { key: "persuasion", label: "설득력" },
  { key: "audience", label: "관중 지지도" },
];

export function UserVerdictForm({
  conversationId,
  sideALabel,
  sideBLabel,
  onSubmitted,
}: UserVerdictFormProps) {
  const [winner, setWinner] = useState<"sideA" | "sideB" | null>(null);
  const [scores, setScores] = useState<Record<string, { a: number; b: number }>>({
    tech: { a: 5, b: 5 },
    evidence: { a: 5, b: 5 },
    persuasion: { a: 5, b: 5 },
    audience: { a: 5, b: 5 },
  });
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const totalA = Object.values(scores).reduce((sum, s) => sum + s.a, 0);
  const totalB = Object.values(scores).reduce((sum, s) => sum + s.b, 0);

  const handleSubmit = async () => {
    if (!winner) return;
    setIsSubmitting(true);

    const scoreLines = CRITERIA.map((c) => {
      const s = scores[c.key];
      return `- ${c.label}: 알파 ${s.a}/10 vs 오메가 ${s.b}/10`;
    }).join("\n");

    const verdict = `## 판결문

### 채점표
${scoreLines}

**총점: 알파 ${totalA}/40 vs 오메가 ${totalB}/40**

### 승자: ${winner === "sideA" ? `알파 (${sideALabel})` : `오메가 (${sideBLabel})`}

### 판결 이유
${reason || "판결 이유가 제공되지 않았습니다."}`;

    try {
      const res = await fetch(`/api/conversations/${conversationId}/verdict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verdict }),
      });
      if (res.ok) {
        setSubmitted(true);
        onSubmitted?.(verdict);
      }
    } catch {
      // Silent fail
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center animate-fade-in-up">
        <div className="text-5xl mb-4">{"\uD83D\uDD28"}</div>
        <h2 className="font-mono text-xl font-bold text-[var(--debate-gold)] mb-2">
          판결 완료!
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          승자: {winner === "sideA" ? `알파 (${sideALabel})` : `오메가 (${sideBLabel})`}
        </p>
        <div className="text-xs text-muted-foreground/50 font-mono">
          총점: 알파 {totalA}/40 vs 오메가 {totalB}/40
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="text-center">
        <div className="text-3xl mb-2">{"\uD83D\uDD28"}</div>
        <h2 className="font-mono text-lg font-bold text-[var(--debate-gold)]">
          판결을 내려주세요
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          중재자로서 토론의 승자를 결정하세요
        </p>
      </div>

      {/* Scoring */}
      <div className="space-y-4">
        {CRITERIA.map((c) => (
          <div key={c.key} className="rounded-xl border border-border/40 bg-card/50 p-4">
            <div className="font-mono text-xs font-semibold text-muted-foreground mb-3">
              {c.label}
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* Alpha score */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-[var(--debate-blue)]">
                    {"\u26A1"} 알파
                  </span>
                  <span className="text-xs font-mono font-bold text-[var(--debate-blue)]">
                    {scores[c.key].a}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={scores[c.key].a}
                  onChange={(e) =>
                    setScores((prev) => ({
                      ...prev,
                      [c.key]: { ...prev[c.key], a: Number(e.target.value) },
                    }))
                  }
                  className="w-full h-1.5 rounded-full appearance-none bg-[var(--debate-blue)]/20 accent-[var(--debate-blue)]"
                />
              </div>
              {/* Omega score */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-[var(--debate-red)]">
                    {"\uD83D\uDD25"} 오메가
                  </span>
                  <span className="text-xs font-mono font-bold text-[var(--debate-red)]">
                    {scores[c.key].b}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={scores[c.key].b}
                  onChange={(e) =>
                    setScores((prev) => ({
                      ...prev,
                      [c.key]: { ...prev[c.key], b: Number(e.target.value) },
                    }))
                  }
                  className="w-full h-1.5 rounded-full appearance-none bg-[var(--debate-red)]/20 accent-[var(--debate-red)]"
                />
              </div>
            </div>
          </div>
        ))}

        {/* Total */}
        <div className="flex items-center justify-center gap-6 py-2">
          <span className="font-mono text-sm">
            <span className="text-[var(--debate-blue)]">{"\u26A1"} 알파 {totalA}</span>
            <span className="text-muted-foreground/40"> / 40</span>
          </span>
          <span className="text-muted-foreground/30">vs</span>
          <span className="font-mono text-sm">
            <span className="text-[var(--debate-red)]">{"\uD83D\uDD25"} 오메가 {totalB}</span>
            <span className="text-muted-foreground/40"> / 40</span>
          </span>
        </div>
      </div>

      {/* Winner selection */}
      <div className="rounded-xl border border-border/40 bg-card/50 p-4">
        <div className="font-mono text-xs font-semibold text-muted-foreground mb-3">
          승자 선택
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setWinner("sideA")}
            className={cn(
              "rounded-lg border-2 p-3 font-mono text-sm transition-all",
              winner === "sideA"
                ? "border-[var(--debate-blue)] bg-[var(--debate-blue)]/10 text-[var(--debate-blue)]"
                : "border-border/40 text-muted-foreground hover:border-[var(--debate-blue)]/40"
            )}
          >
            {"\u26A1"} 알파 승리
            <div className="text-[10px] mt-0.5 opacity-60">{sideALabel}</div>
          </button>
          <button
            onClick={() => setWinner("sideB")}
            className={cn(
              "rounded-lg border-2 p-3 font-mono text-sm transition-all",
              winner === "sideB"
                ? "border-[var(--debate-red)] bg-[var(--debate-red)]/10 text-[var(--debate-red)]"
                : "border-border/40 text-muted-foreground hover:border-[var(--debate-red)]/40"
            )}
          >
            {"\uD83D\uDD25"} 오메가 승리
            <div className="text-[10px] mt-0.5 opacity-60">{sideBLabel}</div>
          </button>
        </div>
      </div>

      {/* Reason */}
      <div className="rounded-xl border border-border/40 bg-card/50 p-4">
        <div className="font-mono text-xs font-semibold text-muted-foreground mb-2">
          판결 이유 (선택)
        </div>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="왜 이쪽이 이겼는지 한 줄로..."
          className="w-full bg-transparent border border-border/30 rounded-lg px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:border-[var(--debate-gold)]/50"
        />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!winner || isSubmitting}
        className={cn(
          "w-full py-3 rounded-lg font-mono text-sm font-semibold transition-all",
          "border border-[var(--debate-gold)]/40 bg-[var(--debate-gold)]/10 text-[var(--debate-gold)]",
          "hover:bg-[var(--debate-gold)]/20 active:scale-[0.98]",
          "disabled:opacity-40 disabled:cursor-not-allowed"
        )}
      >
        {isSubmitting ? "판결 제출 중..." : "\uD83D\uDD28 판결 선고"}
      </button>
    </div>
  );
}
