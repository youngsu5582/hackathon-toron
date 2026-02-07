"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Settings } from "lucide-react";

interface DebateItem {
  id: string;
  status: string;
  debateTopic: string;
  userSide: string;
  agentSide: string;
  turnCount: number;
  maxTurns: number;
  totalVotes: number;
  votes: { user: number; agent: number };
  createdAt: string;
  updatedAt: string;
}

export default function GalleryPage() {
  const [debates, setDebates] = useState<DebateItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDebates = async () => {
      try {
        const res = await fetch("/api/debates");
        if (res.ok) {
          const data = await res.json();
          setDebates(data.debates);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };

    fetchDebates();
    const interval = setInterval(fetchDebates, 10000);
    return () => clearInterval(interval);
  }, []);

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "방금";
    if (mins < 60) return `${mins}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    return `${Math.floor(hours / 24)}일 전`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-5 h-[56px] flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <span className="text-lg">&#9878;</span>
            <span className="font-mono text-sm font-black tracking-wider text-gradient-gold">
              Toron
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="p-2 hover:bg-muted/50 rounded-lg transition-all duration-200"
              title="관리"
            >
              <Settings className="size-4 text-muted-foreground" />
            </Link>
            <Link
              href="/"
              className="font-mono text-xs text-[var(--debate-gold)] hover:text-[var(--debate-gold)]/80 transition-colors px-3 py-1.5 rounded-full border border-[var(--debate-gold)]/20 hover:bg-[var(--debate-gold)]/5"
            >
              + 새 토론
            </Link>
          </div>
        </div>
      </header>

      {/* Stats bar */}
      <div className="border-b border-border/30 bg-card/20">
        <div className="max-w-5xl mx-auto px-5 py-3.5 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="relative w-2 h-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-500 animate-ping opacity-75" />
            </div>
            <span className="font-mono text-xs text-muted-foreground">
              {debates.filter((d) => d.status === "running").length}개 진행 중
            </span>
          </div>
          <span className="font-mono text-xs text-muted-foreground/50">
            총 {debates.length}개 토론
          </span>
          <span className="font-mono text-xs text-muted-foreground/50">
            {debates.reduce((sum, d) => sum + d.totalVotes, 0)}표 투표
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-5 py-10">
        <h1 className="font-mono text-2xl font-bold mb-1.5">토론 갤러리</h1>
        <p className="text-sm text-muted-foreground/60 mb-10">
          진행 중인 토론을 구경하고 투표하세요
        </p>

        {loading ? (
          <div className="flex justify-center py-20">
            <span className="text-sm text-muted-foreground animate-pulse">
              토론 목록 불러오는 중...
            </span>
          </div>
        ) : debates.length === 0 ? (
          <div className="flex flex-col items-center py-20">
            <div className="text-4xl mb-4">&#9878;</div>
            <p className="text-sm text-muted-foreground mb-4">
              아직 토론이 없습니다
            </p>
            <Link
              href="/"
              className="font-mono text-sm text-[var(--debate-gold)] hover:underline"
            >
              첫 번째 토론 시작하기 &rarr;
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {debates.map((debate, i) => {
              const totalVotes = debate.votes.user + debate.votes.agent;
              const userPct =
                totalVotes > 0
                  ? Math.round((debate.votes.user / totalVotes) * 100)
                  : 50;
              const isLive = debate.status === "running";

              return (
                <Link
                  key={debate.id}
                  href={`/debate/${debate.id}`}
                  className={cn(
                    "group rounded-2xl border bg-card/30 p-5 transition-all duration-300",
                    "hover:bg-card/60 hover:-translate-y-1 hover:shadow-lg active:translate-y-0",
                    isLive
                      ? "border-green-500/20 hover:border-green-500/40 hover:shadow-green-500/5"
                      : "border-border/40 hover:border-border/60 hover:shadow-black/10",
                    "animate-fade-in-up"
                  )}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  {/* Top: Status + Time */}
                  <div className="flex items-center justify-between mb-3">
                    {isLive ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 text-[10px] font-mono font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        LIVE
                      </span>
                    ) : debate.status === "completed" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground text-[10px] font-mono">
                        완료
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground/60 text-[10px] font-mono">
                        {debate.status}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground/50 font-mono">
                      {getTimeAgo(debate.updatedAt)}
                    </span>
                  </div>

                  {/* Topic */}
                  <h3 className="font-mono text-sm font-semibold mb-3 group-hover:text-foreground/90 transition-colors">
                    {debate.debateTopic}
                  </h3>

                  {/* Vote bar */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-[10px] text-[var(--debate-blue)] truncate max-w-[80px]">
                      {debate.userSide}
                    </span>
                    <div className="flex-1 h-1.5 bg-muted/50 rounded-full overflow-hidden flex">
                      <div
                        className="h-full vote-bar-blue rounded-l-full transition-all duration-500"
                        style={{ width: `${userPct}%` }}
                      />
                      <div
                        className="h-full vote-bar-red rounded-r-full transition-all duration-500"
                        style={{ width: `${100 - userPct}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] text-[var(--debate-red)] truncate max-w-[80px]">
                      {debate.agentSide}
                    </span>
                  </div>

                  {/* Bottom: Round + Votes */}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: debate.maxTurns }, (_, j) => (
                        <div
                          key={j}
                          className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            j < debate.turnCount
                              ? "bg-[var(--debate-gold)]"
                              : "bg-muted-foreground/20"
                          )}
                        />
                      ))}
                      <span className="font-mono text-[10px] text-muted-foreground/50 ml-1">
                        {debate.turnCount}/{debate.maxTurns}
                      </span>
                    </div>
                    {totalVotes > 0 && (
                      <span className="font-mono text-[10px] text-muted-foreground/50">
                        {totalVotes}표
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
