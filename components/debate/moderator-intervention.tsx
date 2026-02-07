"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

// Topic-specific hints for when the user is losing
const TOPIC_HINTS: Record<string, string[]> = {
  "정규화 vs 역정규화": [
    "분산 트랜잭션에서 역정규화의 데이터 불일치 문제를 물어보세요",
    "Instagram의 역정규화가 초래한 데이터 마이그레이션 비용을 언급해보세요",
    "GDPR 같은 규정 준수에서 정규화의 장점을 강조해보세요",
  ],
  "모놀리스 vs 마이크로서비스": [
    "Amazon Prime Video의 모놀리스 회귀 사례를 반격 근거로 활용하세요",
    "마이크로서비스의 분산 트랜잭션 오버헤드를 지적해보세요",
    "팀 규모 10명 미만에서 마이크로서비스의 오버엔지니어링을 공격하세요",
  ],
  "REST vs GraphQL": [
    "GraphQL의 N+1 문제와 캐싱 복잡성을 파고드세요",
    "REST의 HTTP 캐싱이 CDN과 어떻게 시너지를 내는지 설명하세요",
    "GraphQL 스키마 변경 시 breaking change 관리 비용을 물어보세요",
  ],
  "SQL vs NoSQL": [
    "MongoDB의 조인 성능이 복잡한 쿼리에서 얼마나 떨어지는지 지적하세요",
    "NoSQL의 eventual consistency가 금융 시스템에서 문제되는 케이스를 언급하세요",
    "NewSQL(CockroachDB, TiDB)이 왜 SQL 기반인지 생각해보세요",
  ],
  "부먹 vs 찍먹": [
    "배달 시간 동안 소스가 눅눅해지는 '성능 저하' 문제를 지적하세요",
    "개인별 소스 양 조절 = 커스터마이징의 가치를 강조하세요",
    "부먹은 rollback 불가능한 destructive operation이라고 공격하세요",
  ],
};

interface ModeratorInterventionProps {
  type: "agent-struggling" | "user-hint";
  topic?: string;
  onDismiss?: () => void;
}

export function ModeratorIntervention({
  type,
  topic,
  onDismiss,
}: ModeratorInterventionProps) {
  const [visible, setVisible] = useState(false);
  const [hint, setHint] = useState("");

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setVisible(true), 100);

    // Pick a random hint for user
    if (type === "user-hint" && topic) {
      const hints = TOPIC_HINTS[topic] || [];
      if (hints.length > 0) {
        setHint(hints[Math.floor(Math.random() * hints.length)]);
      }
    }

    // Auto-dismiss after 8 seconds
    const dismissTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss?.(), 300);
    }, 8000);

    return () => {
      clearTimeout(timer);
      clearTimeout(dismissTimer);
    };
  }, [type, topic, onDismiss]);

  if (type === "agent-struggling") {
    return (
      <div
        className={cn(
          "fixed top-16 left-1/2 -translate-x-1/2 z-40 transition-all duration-300",
          visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
        )}
      >
        <div className="rounded-xl border border-[var(--debate-red)]/40 bg-[var(--debate-red)]/10 backdrop-blur-md px-5 py-3 flex items-center gap-3 shadow-lg">
          <span className="text-lg animate-pulse">&#9888;&#65039;</span>
          <div>
            <div className="font-mono text-xs font-semibold text-[var(--debate-red)]">
              중재자 알림
            </div>
            <div className="text-sm text-muted-foreground">
              AI가 고전 중! 전략 수정 중...
            </div>
          </div>
        </div>
      </div>
    );
  }

  // user-hint
  return (
    <div
      className={cn(
        "fixed top-16 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 max-w-md",
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
      )}
    >
      <div className="rounded-xl border border-[var(--debate-gold)]/40 bg-[var(--debate-gold)]/10 backdrop-blur-md px-5 py-3 shadow-lg">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">&#128161;</span>
          <span className="font-mono text-xs font-semibold text-[var(--debate-gold)]">
            중재자 힌트
          </span>
        </div>
        <div className="text-sm text-muted-foreground leading-relaxed">
          {hint || "상대의 논리적 허점을 공략해보세요!"}
        </div>
        <button
          onClick={() => {
            setVisible(false);
            setTimeout(() => onDismiss?.(), 300);
          }}
          className="mt-2 text-[10px] font-mono text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
