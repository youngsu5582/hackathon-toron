"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { AudienceComment } from "@/lib/types";
import { MessageCircle, Swords, Send } from "lucide-react";

interface AudiencePanelProps {
  conversationId: string;
  userSide: string;
  agentSide: string;
  comments: AudienceComment[];
  onCommentAdded?: () => void;
}

export function AudiencePanel({
  conversationId,
  userSide,
  agentSide,
  comments,
  onCommentAdded,
}: AudiencePanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState("");
  const [nickname, setNickname] = useState("");
  const [selectedSide, setSelectedSide] = useState<"user" | "agent" | null>(
    null
  );
  const [isTagIn, setIsTagIn] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  const handleSubmit = async () => {
    if (!content.trim() || sending) return;
    setSending(true);

    try {
      const res = await fetch(
        `/api/conversations/${conversationId}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: content.trim(),
            nickname: nickname.trim() || "관중",
            side: selectedSide,
            isTagIn,
          }),
        }
      );

      if (res.ok) {
        setContent("");
        setIsTagIn(false);
        onCommentAdded?.();
      }
    } catch {
      // silently fail
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-40",
          "flex items-center gap-2 px-4 py-2.5 rounded-full",
          "bg-card/90 backdrop-blur-md border border-border/60",
          "font-mono text-xs font-medium",
          "hover:bg-card hover:border-border transition-all duration-200",
          "shadow-lg shadow-black/20",
          "animate-fade-in-up"
        )}
      >
        <MessageCircle className="size-4 text-[var(--debate-gold)]" />
        관중석
        {comments.length > 0 && (
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[var(--debate-gold)]/15 text-[var(--debate-gold)] text-[10px]">
            {comments.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 w-80 animate-fade-in-scale">
      <div className="rounded-xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-xl shadow-black/30 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50">
          <div className="flex items-center gap-2">
            <MessageCircle className="size-3.5 text-[var(--debate-gold)]" />
            <span className="font-mono text-xs font-semibold">관중석</span>
            <span className="text-[10px] text-muted-foreground/50">
              {comments.length}개 의견
            </span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-muted-foreground/50 hover:text-muted-foreground text-sm transition-colors"
          >
            &times;
          </button>
        </div>

        {/* Comments list */}
        <div
          ref={scrollRef}
          className="max-h-60 overflow-y-auto p-3 space-y-2"
        >
          {comments.length === 0 ? (
            <p className="text-center text-[11px] text-muted-foreground/40 py-4">
              아직 관중 의견이 없습니다
              <br />
              첫 번째 응원을 남겨보세요!
            </p>
          ) : (
            comments.map((c) => (
              <div
                key={c.id}
                className={cn(
                  "rounded-lg px-3 py-2 text-xs",
                  c.isTagIn
                    ? "border border-[var(--debate-gold)]/30 bg-[var(--debate-gold)]/5"
                    : "bg-muted/30"
                )}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="font-mono font-semibold text-[11px]">
                    {c.nickname}
                  </span>
                  {c.side === "user" && (
                    <span className="px-1 py-0.5 rounded text-[9px] bg-[var(--debate-blue)]/15 text-[var(--debate-blue)]">
                      {userSide}
                    </span>
                  )}
                  {c.side === "agent" && (
                    <span className="px-1 py-0.5 rounded text-[9px] bg-[var(--debate-red)]/15 text-[var(--debate-red)]">
                      {agentSide}
                    </span>
                  )}
                  {c.isTagIn && (
                    <span className="px-1 py-0.5 rounded text-[9px] bg-[var(--debate-gold)]/15 text-[var(--debate-gold)]">
                      <Swords className="size-2.5 inline mr-0.5" />
                      참전
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {c.content}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Input area */}
        <div className="border-t border-border/50 p-3 space-y-2">
          {/* Nickname */}
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="닉네임 (선택)"
            className="w-full rounded-md bg-background/50 border border-border/40 px-2.5 py-1.5 text-[11px] font-mono placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-[var(--debate-gold)]/30"
          />

          {/* Side selection + Tag-in toggle */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() =>
                setSelectedSide(selectedSide === "user" ? null : "user")
              }
              className={cn(
                "flex-1 py-1 rounded-md text-[10px] font-mono border transition-all",
                selectedSide === "user"
                  ? "border-[var(--debate-blue)]/50 bg-[var(--debate-blue)]/15 text-[var(--debate-blue)]"
                  : "border-border/30 text-muted-foreground/50 hover:border-border/60"
              )}
            >
              {userSide}
            </button>
            <button
              onClick={() => setSelectedSide(null)}
              className={cn(
                "px-2 py-1 rounded-md text-[10px] font-mono border transition-all",
                selectedSide === null
                  ? "border-border/60 bg-muted/30 text-muted-foreground"
                  : "border-border/30 text-muted-foreground/50 hover:border-border/60"
              )}
            >
              중립
            </button>
            <button
              onClick={() =>
                setSelectedSide(selectedSide === "agent" ? null : "agent")
              }
              className={cn(
                "flex-1 py-1 rounded-md text-[10px] font-mono border transition-all",
                selectedSide === "agent"
                  ? "border-[var(--debate-red)]/50 bg-[var(--debate-red)]/15 text-[var(--debate-red)]"
                  : "border-border/30 text-muted-foreground/50 hover:border-border/60"
              )}
            >
              {agentSide}
            </button>
          </div>

          {/* Tag-in toggle */}
          <button
            onClick={() => setIsTagIn(!isTagIn)}
            className={cn(
              "w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-mono border transition-all",
              isTagIn
                ? "border-[var(--debate-gold)]/50 bg-[var(--debate-gold)]/10 text-[var(--debate-gold)]"
                : "border-border/30 text-muted-foreground/40 hover:border-border/60 hover:text-muted-foreground/60"
            )}
          >
            <Swords className="size-3" />
            {isTagIn ? "태그인 모드 ON — 대신 반론!" : "태그인: 직접 참전하기"}
          </button>

          {/* Message input */}
          <div className="flex gap-1.5">
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder={
                isTagIn
                  ? "대신 반론을 작성하세요..."
                  : "응원 또는 야유를 남기세요..."
              }
              className="flex-1 rounded-md bg-background/50 border border-border/40 px-2.5 py-2 text-xs placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-[var(--debate-gold)]/30"
            />
            <button
              onClick={handleSubmit}
              disabled={!content.trim() || sending}
              className={cn(
                "px-2.5 rounded-md transition-all",
                content.trim() && !sending
                  ? "bg-[var(--debate-gold)]/15 text-[var(--debate-gold)] hover:bg-[var(--debate-gold)]/25"
                  : "bg-muted/20 text-muted-foreground/30"
              )}
            >
              <Send className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
