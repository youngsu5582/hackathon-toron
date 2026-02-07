"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import Link from "next/link";
import { CCMessages } from "@/components/chat/cc-messages";
import { DebateHeader } from "@/components/debate/debate-header";
import { VerdictDisplay } from "@/components/debate/verdict-display";
import { AudiencePanel } from "@/components/debate/audience-panel";
import { cn } from "@/lib/utils";
import type { SessionEntry, ConversationResponse, AudienceComment } from "@/lib/types";
import { Check, Copy, Share2 } from "lucide-react";

export default function DebatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<ConversationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/conversations/${id}`);
      if (res.ok) {
        const json: ConversationResponse = await res.json();
        setData(json);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Poll while running
  useEffect(() => {
    fetchData();

    const interval = setInterval(() => {
      fetchData();
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchData]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: data?.debateTopic
            ? `${data.debateTopic} - Toron`
            : "Toron - AI 기술 토론 아레나",
          url: window.location.href,
        });
      } catch {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleVote = async (side: "user" | "agent") => {
    try {
      const res = await fetch(`/api/conversations/${id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ side }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch {
      // silently fail
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-sm text-muted-foreground animate-pulse font-mono">
          토론 불러오는 중...
        </span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="text-4xl mb-4">&#9878;</div>
        <p className="text-sm text-muted-foreground mb-4">
          토론을 찾을 수 없습니다
        </p>
        <Link
          href="/"
          className="font-mono text-sm text-[var(--debate-gold)] hover:underline"
        >
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  const isLive = data.status === "running";
  const isCompleted = data.status === "completed" || data.status === "error";
  const hasVerdict =
    isCompleted && data.turnCount !== undefined && data.turnCount > (data.maxTurns || 5);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-5 h-[56px] flex items-center justify-between">
          <Link
            href="/gallery"
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <span className="text-lg">&#9878;</span>
            <span className="font-mono text-sm font-black tracking-wider text-gradient-gold">
              Toron
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {isLive && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 text-[10px] font-mono font-semibold mr-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                LIVE
              </span>
            )}
            <button
              onClick={handleCopyLink}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-mono",
                "border border-border/60 hover:bg-muted/50 transition-all duration-200",
                copied && "border-green-500/40 text-green-400"
              )}
            >
              {copied ? (
                <>
                  <Check className="size-3" />
                  복사됨
                </>
              ) : (
                <>
                  <Copy className="size-3" />
                  링크
                </>
              )}
            </button>
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-mono border border-[var(--debate-gold)]/30 text-[var(--debate-gold)] hover:bg-[var(--debate-gold)]/10 transition-all duration-200"
            >
              <Share2 className="size-3" />
              공유
            </button>
          </div>
        </div>
      </header>

      {/* Debate header */}
      {data.userSide && data.agentSide && data.debateTopic && (
        <DebateHeader
          topic={data.debateTopic}
          userSide={data.userSide}
          agentSide={data.agentSide}
          turnCount={data.turnCount || 0}
          maxTurns={data.maxTurns || 5}
          votes={data.votes}
          onVote={handleVote}
        />
      )}

      {/* Verdict */}
      {hasVerdict && <VerdictDisplay conversationId={id} />}

      {/* Messages (read-only) */}
      <div className="flex-1 overflow-auto">
        {data.messages.length > 0 ? (
          <div className="max-w-3xl mx-auto px-4 py-6">
            <CCMessages entries={data.messages} />
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full py-20">
            <span className="text-sm text-muted-foreground animate-pulse">
              {isLive ? "토론 진행 중..." : "메시지가 없습니다"}
            </span>
          </div>
        )}
      </div>

      {/* Spectator notice */}
      <div className="border-t border-border/50 bg-card/30 py-3">
        <div className="max-w-3xl mx-auto px-4 flex items-center justify-between">
          <span className="font-mono text-[11px] text-muted-foreground/50">
            &#128065; 관전 모드 &mdash; 투표하고 관중석에서 난입하세요
          </span>
          <Link
            href="/"
            className="font-mono text-[11px] text-[var(--debate-gold)]/70 hover:text-[var(--debate-gold)] transition-colors"
          >
            나도 토론하기 &rarr;
          </Link>
        </div>
      </div>

      {/* Audience Panel for spectators */}
      {data.userSide && data.agentSide && (
        <AudiencePanel
          conversationId={id}
          userSide={data.userSide}
          agentSide={data.agentSide}
          comments={data.comments || []}
          onCommentAdded={() => fetchData()}
        />
      )}
    </div>
  );
}
