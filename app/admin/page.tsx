"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Trash2, RefreshCw, CheckSquare, Square, AlertTriangle, ExternalLink } from "lucide-react";

interface AdminDebate {
  id: string;
  status: string;
  debateTopic: string;
  userSide: string;
  agentSide: string;
  turnCount: number;
  maxTurns: number;
  debateMode: string;
  volumeId: string | null;
  sandboxId: string | null;
  sessionId: string | null;
  errorMessage: string | null;
  voteCount: number;
  commentCount: number;
  turnDataCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function AdminPage() {
  const [debates, setDebates] = useState<AdminDebate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchDebates = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/debates");
      if (res.ok) {
        const data = await res.json();
        setDebates(data.debates);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDebates();
  }, [fetchDebates]);

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return `${secs}초 전`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    return `${days}일 전`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filteredDebates.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredDebates.map((d) => d.id)));
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/debates/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDebates((prev) => prev.filter((d) => d.id !== id));
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    } catch {
      // silently fail
    } finally {
      setDeleting(false);
      setConfirmDeleteId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/debates", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      if (res.ok) {
        setDebates((prev) => prev.filter((d) => !selected.has(d.id)));
        setSelected(new Set());
      }
    } catch {
      // silently fail
    } finally {
      setDeleting(false);
      setConfirmBulk(false);
    }
  };

  const statusCounts = debates.reduce(
    (acc, d) => {
      acc[d.status] = (acc[d.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const filteredDebates =
    statusFilter === "all"
      ? debates
      : debates.filter((d) => d.status === statusFilter);

  const statusColor = (status: string) => {
    switch (status) {
      case "running":
        return "text-green-400 bg-green-500/10 border-green-500/20";
      case "completed":
        return "text-blue-400 bg-blue-500/10 border-blue-500/20";
      case "error":
        return "text-red-400 bg-red-500/10 border-red-500/20";
      case "idle":
        return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
      default:
        return "text-muted-foreground bg-muted/50 border-border/50";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/30">
        <div className="max-w-7xl mx-auto px-6 h-[56px] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <span className="text-lg">&#9878;</span>
              <span className="font-mono text-sm font-black tracking-wider text-gradient-gold">
                Toron
              </span>
            </Link>
            <div className="h-4 w-px bg-border/40" />
            <span className="font-mono text-xs text-muted-foreground/60 uppercase tracking-wider">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/gallery"
              className="font-mono text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              Gallery
            </Link>
            <button
              onClick={() => {
                setLoading(true);
                fetchDebates();
              }}
              className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
              title="새로고침"
            >
              <RefreshCw className={cn("size-4 text-muted-foreground", loading && "animate-spin")} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Title + Stats */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="font-mono text-2xl font-bold mb-1">토론 관리</h1>
            <p className="text-sm text-muted-foreground/50">
              전체 {debates.length}개 토론
            </p>
          </div>
          {selected.size > 0 && (
            <button
              onClick={() => setConfirmBulk(true)}
              disabled={deleting}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs font-semibold",
                "bg-red-500/10 text-red-400 border border-red-500/20",
                "hover:bg-red-500/20 transition-colors",
                "disabled:opacity-50"
              )}
            >
              <Trash2 className="size-3.5" />
              {selected.size}개 삭제
            </button>
          )}
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setStatusFilter("all")}
            className={cn(
              "px-3 py-1.5 rounded-lg font-mono text-xs transition-colors border",
              statusFilter === "all"
                ? "bg-muted/50 text-foreground border-border/60"
                : "text-muted-foreground/50 border-transparent hover:text-muted-foreground hover:bg-muted/20"
            )}
          >
            전체 ({debates.length})
          </button>
          {Object.entries(statusCounts).map(([status, count]) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-3 py-1.5 rounded-lg font-mono text-xs transition-colors border",
                statusFilter === status
                  ? statusColor(status)
                  : "text-muted-foreground/50 border-transparent hover:text-muted-foreground hover:bg-muted/20"
              )}
            >
              {status} ({count})
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-20">
            <span className="text-sm text-muted-foreground animate-pulse font-mono">
              로딩 중...
            </span>
          </div>
        ) : filteredDebates.length === 0 ? (
          <div className="flex flex-col items-center py-20">
            <div className="text-4xl mb-4">&#9878;</div>
            <p className="text-sm text-muted-foreground/50 font-mono">
              {statusFilter === "all" ? "토론이 없습니다" : `${statusFilter} 상태의 토론이 없습니다`}
            </p>
          </div>
        ) : (
          <div className="border border-border/30 rounded-xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[40px_1fr_100px_80px_80px_80px_120px_60px] gap-2 px-4 py-3 bg-muted/20 border-b border-border/30 text-[11px] font-mono text-muted-foreground/50 uppercase tracking-wider">
              <div className="flex items-center justify-center">
                <button onClick={toggleSelectAll} className="hover:text-muted-foreground transition-colors">
                  {selected.size === filteredDebates.length && filteredDebates.length > 0 ? (
                    <CheckSquare className="size-4" />
                  ) : (
                    <Square className="size-4" />
                  )}
                </button>
              </div>
              <div>토론</div>
              <div>상태</div>
              <div className="text-center">라운드</div>
              <div className="text-center">투표</div>
              <div className="text-center">댓글</div>
              <div>수정일</div>
              <div></div>
            </div>

            {/* Table rows */}
            {filteredDebates.map((debate) => (
              <div
                key={debate.id}
                className={cn(
                  "grid grid-cols-[40px_1fr_100px_80px_80px_80px_120px_60px] gap-2 px-4 py-3 border-b border-border/20 items-center",
                  "hover:bg-muted/10 transition-colors",
                  selected.has(debate.id) && "bg-muted/15"
                )}
              >
                {/* Checkbox */}
                <div className="flex items-center justify-center">
                  <button
                    onClick={() => toggleSelect(debate.id)}
                    className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  >
                    {selected.has(debate.id) ? (
                      <CheckSquare className="size-4 text-[var(--debate-gold)]" />
                    ) : (
                      <Square className="size-4" />
                    )}
                  </button>
                </div>

                {/* Topic info */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold truncate">
                      {debate.debateTopic}
                    </span>
                    {debate.debateMode === "ai-vs-ai" && (
                      <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        AI vs AI
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-muted-foreground/40 font-mono truncate">
                      {debate.userSide} vs {debate.agentSide}
                    </span>
                    <span className="text-[10px] text-muted-foreground/25 font-mono">
                      {debate.id.slice(0, 8)}...
                    </span>
                  </div>
                  {debate.errorMessage && (
                    <div className="flex items-center gap-1 mt-1">
                      <AlertTriangle className="size-3 text-red-400/60" />
                      <span className="text-[10px] text-red-400/60 font-mono truncate max-w-[300px]">
                        {debate.errorMessage}
                      </span>
                    </div>
                  )}
                </div>

                {/* Status */}
                <div>
                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-mono font-medium border",
                    statusColor(debate.status)
                  )}>
                    {debate.status === "running" && (
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    )}
                    {debate.status}
                  </span>
                </div>

                {/* Rounds */}
                <div className="text-center font-mono text-xs text-muted-foreground/60">
                  {debate.turnCount}/{debate.maxTurns}
                </div>

                {/* Votes */}
                <div className="text-center font-mono text-xs text-muted-foreground/60">
                  {debate.voteCount}
                </div>

                {/* Comments */}
                <div className="text-center font-mono text-xs text-muted-foreground/60">
                  {debate.commentCount}
                </div>

                {/* Date */}
                <div className="font-mono text-[11px] text-muted-foreground/40">
                  <div>{formatDate(debate.updatedAt)}</div>
                  <div className="text-[10px] text-muted-foreground/25">
                    {getTimeAgo(debate.updatedAt)}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <Link
                    href={`/debate/${debate.id}`}
                    className="p-1.5 hover:bg-muted/30 rounded transition-colors"
                    title="보기"
                  >
                    <ExternalLink className="size-3.5 text-muted-foreground/40" />
                  </Link>
                  <button
                    onClick={() => setConfirmDeleteId(debate.id)}
                    disabled={deleting}
                    className="p-1.5 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                    title="삭제"
                  >
                    <Trash2 className="size-3.5 text-muted-foreground/40 hover:text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Single delete confirm modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setConfirmDeleteId(null)}
          />
          <div className="relative z-10 w-full max-w-sm mx-4 rounded-2xl border border-border/40 bg-card/95 backdrop-blur-xl p-6 animate-fade-in-scale shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-red-500/10">
                <Trash2 className="size-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-mono text-sm font-bold">토론 삭제</h3>
                <p className="text-xs text-muted-foreground/50 mt-0.5">
                  이 토론을 삭제하시겠습니까?
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground/60 mb-1 font-mono">
              {debates.find((d) => d.id === confirmDeleteId)?.debateTopic}
            </p>
            <p className="text-[10px] text-muted-foreground/30 mb-5 font-mono">
              관련된 투표, 댓글, 턴 데이터가 모두 삭제됩니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-2 rounded-lg font-mono text-xs text-muted-foreground/60 border border-border/30 hover:bg-muted/20 transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={deleting}
                className="flex-1 py-2 rounded-lg font-mono text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50"
              >
                {deleting ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk delete confirm modal */}
      {confirmBulk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setConfirmBulk(false)}
          />
          <div className="relative z-10 w-full max-w-sm mx-4 rounded-2xl border border-border/40 bg-card/95 backdrop-blur-xl p-6 animate-fade-in-scale shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-red-500/10">
                <Trash2 className="size-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-mono text-sm font-bold">일괄 삭제</h3>
                <p className="text-xs text-muted-foreground/50 mt-0.5">
                  {selected.size}개 토론을 삭제하시겠습니까?
                </p>
              </div>
            </div>
            <div className="max-h-32 overflow-auto mb-5 space-y-1">
              {Array.from(selected).map((id) => {
                const d = debates.find((d) => d.id === id);
                return (
                  <div key={id} className="text-[11px] font-mono text-muted-foreground/50 truncate">
                    {d?.debateTopic || id}
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground/30 mb-5 font-mono">
              관련된 모든 투표, 댓글, 턴 데이터가 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmBulk(false)}
                className="flex-1 py-2 rounded-lg font-mono text-xs text-muted-foreground/60 border border-border/30 hover:bg-muted/20 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={deleting}
                className="flex-1 py-2 rounded-lg font-mono text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50"
              >
                {deleting ? "삭제 중..." : `${selected.size}개 삭제`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
