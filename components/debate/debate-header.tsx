"use client";

import { cn } from "@/lib/utils";

interface DebateHeaderProps {
  topic: string;
  userSide: string;
  agentSide: string;
  turnCount: number;
  maxTurns: number;
  votes?: { user: number; agent: number };
  onVote?: (side: "user" | "agent") => void;
}

export function DebateHeader({
  topic,
  userSide,
  agentSide,
  turnCount,
  maxTurns,
  votes,
  onVote,
}: DebateHeaderProps) {
  const totalVotes = (votes?.user || 0) + (votes?.agent || 0);
  const userPct =
    totalVotes > 0
      ? Math.round(((votes?.user || 0) / totalVotes) * 100)
      : 50;
  const agentPct = totalVotes > 0 ? 100 - userPct : 50;

  return (
    <div className="border-b border-border bg-card/30 backdrop-blur-sm px-4 py-3">
      {/* Top row: Topic + Round */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-sm">&#9878;</span>
          <span className="font-mono text-xs font-medium text-muted-foreground">
            {topic}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: maxTurns }, (_, i) => (
            <div
              key={i}
              className={cn(
                "w-2 h-2 rounded-full transition-colors duration-300",
                i < turnCount
                  ? "bg-[var(--debate-gold)]"
                  : "bg-muted-foreground/20"
              )}
            />
          ))}
          <span className="font-mono text-[11px] text-muted-foreground ml-1.5">
            {turnCount}/{maxTurns}
          </span>
        </div>
      </div>

      {/* Vote bar row */}
      <div className="flex items-center gap-2.5">
        {/* User side vote button */}
        <button
          onClick={() => onVote?.("user")}
          className={cn(
            "font-mono text-[11px] px-2.5 py-1 rounded-md",
            "border border-[var(--debate-blue)]/25 text-[var(--debate-blue)]",
            "hover:bg-[var(--debate-blue)]/10 hover:border-[var(--debate-blue)]/40",
            "active:scale-[0.97] transition-all duration-150",
            "whitespace-nowrap"
          )}
          aria-label={`${userSide}에 투표`}
        >
          {userSide}
        </button>

        {/* Progress bar */}
        <div
          className="flex-1 h-2.5 bg-muted/50 rounded-full overflow-hidden flex"
          role="progressbar"
          aria-valuenow={userPct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full vote-bar-blue rounded-l-full transition-all duration-700 ease-out"
            style={{ width: `${userPct}%` }}
          />
          <div
            className="h-full vote-bar-red rounded-r-full transition-all duration-700 ease-out"
            style={{ width: `${agentPct}%` }}
          />
        </div>

        {/* Agent side vote button */}
        <button
          onClick={() => onVote?.("agent")}
          className={cn(
            "font-mono text-[11px] px-2.5 py-1 rounded-md",
            "border border-[var(--debate-red)]/25 text-[var(--debate-red)]",
            "hover:bg-[var(--debate-red)]/10 hover:border-[var(--debate-red)]/40",
            "active:scale-[0.97] transition-all duration-150",
            "whitespace-nowrap"
          )}
          aria-label={`${agentSide}에 투표`}
        >
          {agentSide}
        </button>
      </div>

      {/* Vote counts */}
      {totalVotes > 0 && (
        <div className="flex justify-between text-[10px] text-muted-foreground/60 mt-1.5 px-0.5">
          <span>
            {userPct}% ({votes?.user || 0}표)
          </span>
          <span className="text-muted-foreground/40">
            {totalVotes}표 참여
          </span>
          <span>
            {agentPct}% ({votes?.agent || 0}표)
          </span>
        </div>
      )}
    </div>
  );
}
