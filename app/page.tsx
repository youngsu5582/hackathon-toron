"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { CCMessages } from "@/components/chat/cc-messages";
import { PromptForm } from "@/components/chat/prompt-form";
import { WorkspacePanel } from "@/components/workspace/workspace-panel";
import { TopicCard } from "@/components/debate/topic-card";
import { SideSelector } from "@/components/debate/side-selector";
import { DebateHeader } from "@/components/debate/debate-header";
import { VerdictDisplay } from "@/components/debate/verdict-display";
import { VSScreen } from "@/components/debate/vs-screen";
import { CustomTopicModal } from "@/components/debate/custom-topic-modal";
import { AudiencePanel } from "@/components/debate/audience-panel";
import { ModeratorBriefing } from "@/components/debate/moderator-briefing";
import { ModeratorIntervention } from "@/components/debate/moderator-intervention";
import { AiBattleView } from "@/components/debate/ai-battle-view";
import { UserVerdictForm } from "@/components/debate/user-verdict-form";
import { DEBATE_TOPICS, type DebateTopic } from "@/lib/debate-topics";
import type { SessionEntry, ConversationResponse, AudienceComment, Evidence, DebateTurnData } from "@/lib/types";
import { PanelRight, Gavel, LayoutGrid, Settings } from "lucide-react";
import Link from "next/link";

// Pending message type for optimistic UI
interface PendingMessage {
  id: string;
  content: string;
  timestamp: string;
}

type DebatePhase = "topic-select" | "side-select" | "vs-intro" | "briefing" | "debating" | "verdict" | "ai-battle" | "user-verdict";

export default function Home() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [status, setStatus] = useState<ConversationResponse["status"]>("idle");
  const [serverMessages, setServerMessages] = useState<SessionEntry[]>([]);
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showWorkspace, setShowWorkspace] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Debate state
  const [debatePhase, setDebatePhase] = useState<DebatePhase>("topic-select");
  const [selectedTopic, setSelectedTopic] = useState<DebateTopic | null>(null);
  const [userSide, setUserSide] = useState<string | null>(null);
  const [agentSide, setAgentSide] = useState<string | null>(null);
  const [turnCount, setTurnCount] = useState(0);
  const [maxTurns, setMaxTurns] = useState(5);
  const [votes, setVotes] = useState<{ user: number; agent: number }>({
    user: 0,
    agent: 0,
  });
  const [verdictRequested, setVerdictRequested] = useState(false);
  const [showCustomTopicModal, setShowCustomTopicModal] = useState(false);
  const [audienceComments, setAudienceComments] = useState<AudienceComment[]>([]);
  const [interventionType, setInterventionType] = useState<"agent-struggling" | "user-hint" | null>(null);
  const [showIntervention, setShowIntervention] = useState(false);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [debateMode, setDebateMode] = useState<"user-vs-ai" | "ai-vs-ai">("user-vs-ai");
  const [aiTurns, setAiTurns] = useState<DebateTurnData[]>([]);
  const [currentSide, setCurrentSide] = useState<string | undefined>();

  // Track post-completion poll attempts to avoid infinite polling
  const postCompletionPollsRef = useRef(0);

  // Extract text from a user message content (handles both string and ContentBlock[]).
  const getUserMessageText = useCallback(
    (content: string | unknown[]): string => {
      if (typeof content === "string") return content;
      if (Array.isArray(content)) {
        return content
          .filter((b: any) => b.type === "text" && b.text)
          .map((b: any) => b.text)
          .join("\n");
      }
      return "";
    },
    []
  );

  // Check if a pending message has a matching user message in server data.
  // Uses .includes() because server messages wrap raw user text in debate system context.
  const hasPendingMatch = useCallback(
    (pending: PendingMessage, serverMsgs: SessionEntry[]) => {
      return serverMsgs.some(
        (m) =>
          m.type === "user" &&
          getUserMessageText(m.message.content).includes(pending.content)
      );
    },
    [getUserMessageText]
  );

  // Polling for conversation updates
  useEffect(() => {
    if (!conversationId) return;

    const isDone = status === "completed" || status === "error";

    // For AI vs AI battle: keep polling even if "completed" because the
    // status endpoint may chain back to "running" for the next turn.
    const isAiBattleInProgress = debatePhase === "ai-battle";

    if (
      isDone &&
      !isAiBattleInProgress &&
      (pendingMessages.length === 0 || postCompletionPollsRef.current >= 10)
    )
      return;
    if (!isDone && status !== "running") return;

    // AI vs AI turns take 30+ seconds each; poll less aggressively to save DB connections
    const pollMs = isAiBattleInProgress ? 5000 : 2000;
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/conversations/${conversationId}`);
        if (response.ok) {
          const data: ConversationResponse = await response.json();

          setServerMessages(data.messages);
          if (data.evidence) setEvidence(data.evidence);

          if (data.messages.length > 0) {
            setPendingMessages((prev) =>
              prev.filter((p) => !hasPendingMatch(p, data.messages))
            );
          }

          if (data.status === "completed" || data.status === "error") {
            postCompletionPollsRef.current++;
          }

          setStatus(data.status);
          setErrorMessage(data.errorMessage || null);
          setRefreshTrigger((prev) => prev + 1);

          // Sync debate metadata from server
          if (data.turnCount !== undefined) setTurnCount(data.turnCount);
          if (data.maxTurns !== undefined) setMaxTurns(data.maxTurns);
          if (data.votes) setVotes(data.votes);
          if (data.comments) setAudienceComments(data.comments);

          // Sync AI vs AI data
          if (data.debateMode) setDebateMode(data.debateMode);
          if (data.currentSide) setCurrentSide(data.currentSide);
          if (data.turns) setAiTurns(data.turns);

          // Detect completion
          if (data.status === "completed" || data.status === "error") {
            if (data.debateMode === "ai-vs-ai") {
              // AI vs AI: show user verdict form only when ALL turns are done
              const allTurnsDone = (data.turnCount || 0) >= (data.maxTurns || 5);
              if (debatePhase === "ai-battle" && !data.userVerdict && allTurnsDone) {
                setDebatePhase("user-verdict");
              }
            } else if (verdictRequested) {
              setDebatePhase("verdict");
            }
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, pollMs);

    return () => clearInterval(pollInterval);
  }, [
    conversationId,
    status,
    pendingMessages.length,
    hasPendingMatch,
    verdictRequested,
    debatePhase,
  ]);

  // Calculate intervention mode from votes + audience comments
  useEffect(() => {
    if (debatePhase !== "debating" || turnCount < 2) return;

    const userComments = audienceComments.filter((c) => c.side === "user").length;
    const agentComments = audienceComments.filter((c) => c.side === "agent").length;
    const agentLosingScore = (votes.user - votes.agent) + (userComments - agentComments) * 0.5;

    if (agentLosingScore >= 3 && interventionType !== "agent-struggling") {
      setInterventionType("agent-struggling");
      setShowIntervention(true);
    } else if (agentLosingScore <= -3 && interventionType !== "user-hint") {
      setInterventionType("user-hint");
      setShowIntervention(true);
    }
  }, [votes, audienceComments, debatePhase, turnCount, interventionType]);

  // Compute combined messages, sorted by timestamp for correct chronological order
  const messages: SessionEntry[] = [
    ...serverMessages,
    ...pendingMessages.map(
      (p): SessionEntry => ({
        type: "user",
        uuid: p.id,
        parentUuid:
          serverMessages.length > 0
            ? serverMessages[serverMessages.length - 1].uuid
            : null,
        sessionId: "",
        timestamp: p.timestamp,
        isSidechain: false,
        message: {
          role: "user",
          content: p.content,
        },
      })
    ),
  ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [serverMessages, pendingMessages]);

  const handleSubmit = useCallback(
    async (content: string, opts?: { isVerdictRequest?: boolean }) => {
      setIsSubmitting(true);
      setErrorMessage(null);
      postCompletionPollsRef.current = 0;

      const pendingId = `pending-${Date.now()}`;
      const pendingMsg: PendingMessage = {
        id: pendingId,
        content,
        timestamp: new Date().toISOString(),
      };
      setPendingMessages((prev) => [...prev, pendingMsg]);

      try {
        const response = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            content,
            isVerdictRequest: opts?.isVerdictRequest || false,
            // debateMetadata is only sent for the first message (no conversationId)
            ...(!conversationId && selectedTopic && userSide && agentSide
              ? {
                  debateMetadata: {
                    topic: selectedTopic.title,
                    userSide,
                    agentSide,
                    debateMode,
                  },
                }
              : {}),
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to send message");
        }

        const data = await response.json();
        setConversationId(data.conversationId);
        setStatus("running");
      } catch (error) {
        setPendingMessages((prev) => prev.filter((m) => m.id !== pendingId));
        setErrorMessage(
          error instanceof Error ? error.message : "Unknown error"
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [conversationId, selectedTopic, userSide, agentSide]
  );

  const handleTopicSelect = useCallback((topic: DebateTopic) => {
    setSelectedTopic(topic);
    if (debateMode === "ai-vs-ai") {
      // AI vs AI: auto-assign sides, skip side selection
      setUserSide(topic.sideA.label);
      setAgentSide(topic.sideB.label);
      setDebatePhase("vs-intro");
    } else {
      setDebatePhase("side-select");
    }
  }, [debateMode]);

  const handleSideSelect = useCallback(
    (selectedUserSide: string, selectedAgentSide: string) => {
      setUserSide(selectedUserSide);
      setAgentSide(selectedAgentSide);
      setDebatePhase("vs-intro");
    },
    []
  );

  const startDebate = useCallback(() => {
    if (debateMode === "ai-vs-ai") {
      setDebatePhase("ai-battle");
      handleSubmit("토론을 시작합니다. 첫 번째 주장을 펼쳐주세요.");
    } else {
      setDebatePhase("debating");
      if (userSide) {
        handleSubmit(
          `나는 "${userSide}" 입장을 지지합니다. 당신의 첫 번째 주장을 펼쳐보세요!`
        );
      }
    }
  }, [debateMode, handleSubmit, userSide]);

  const handleVSComplete = useCallback(() => {
    if (selectedTopic?.briefing) {
      setDebatePhase("briefing");
    } else {
      startDebate();
    }
  }, [startDebate, selectedTopic]);

  const handleBriefingComplete = useCallback(() => {
    startDebate();
  }, [startDebate]);

  const handleCustomTopicSubmit = useCallback(
    (topic: DebateTopic) => {
      setSelectedTopic(topic);
      setShowCustomTopicModal(false);
      setDebatePhase("side-select");
    },
    []
  );

  const handleVerdictRequest = useCallback(() => {
    setVerdictRequested(true);
    handleSubmit(
      "이제 충분히 토론했습니다. 재판장으로서 공정한 판결을 내려주세요.",
      { isVerdictRequest: true }
    );
  }, [handleSubmit]);

  const handleVote = useCallback(
    async (side: "user" | "agent") => {
      if (!conversationId) return;
      try {
        const res = await fetch(
          `/api/conversations/${conversationId}/vote`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ side }),
          }
        );
        if (res.ok) {
          const data = await res.json();
          setVotes(data);
        }
      } catch {
        // Silent fail for votes
      }
    },
    [conversationId]
  );

  const isLoading = status === "running" || isSubmitting;
  const isAiVsAi = debateMode === "ai-vs-ai";
  const hasMessages = messages.length > 0 || aiTurns.length > 0;
  const canRequestVerdict =
    turnCount >= maxTurns && !verdictRequested && debatePhase === "debating";

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border/40 px-5 h-[56px] bg-background/80 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <span className="text-lg" style={{ animation: 'float-subtle 3s ease-in-out infinite' }}>&#9878;</span>
          <span className="font-mono text-sm font-black tracking-wider text-gradient-gold">
            Toron
          </span>
        </div>
        <div className="flex items-center gap-2">
          {debatePhase !== "topic-select" &&
            debatePhase !== "side-select" &&
            debatePhase !== "vs-intro" &&
            debatePhase !== "briefing" &&
            selectedTopic && (
              <span className="text-xs text-muted-foreground/70 font-mono px-2.5 py-1 rounded-full bg-muted/30 border border-border/30">
                {isAiVsAi ? `AI vs AI | ${selectedTopic.title}` : selectedTopic.title}
              </span>
            )}
          <Link
            href="/gallery"
            className="p-2 hover:bg-muted/50 rounded-lg transition-all duration-200 hover:scale-105"
            title="토론 갤러리"
          >
            <LayoutGrid className="size-4 text-muted-foreground" />
          </Link>
          <Link
            href="/admin"
            className="p-2 hover:bg-muted/50 rounded-lg transition-all duration-200 hover:scale-105"
            title="관리"
          >
            <Settings className="size-4 text-muted-foreground" />
          </Link>
          {!showWorkspace && hasMessages && (
            <button
              onClick={() => setShowWorkspace(true)}
              className="p-2 hover:bg-muted/50 rounded-lg transition-all duration-200 hover:scale-105"
              title="Open workspace"
            >
              <PanelRight className="size-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Chat panel */}
        <ResizablePanel
          defaultSize={showWorkspace && hasMessages ? 55 : 100}
          minSize={40}
        >
          <div className="flex h-full flex-col">
            {/* Debate header bar (during debate or AI battle) */}
            {(debatePhase === "debating" || debatePhase === "ai-battle" || debatePhase === "user-verdict") &&
              userSide &&
              agentSide &&
              selectedTopic && (
                <DebateHeader
                  topic={selectedTopic.title}
                  userSide={isAiVsAi ? `\u26A1 알파 (${userSide})` : userSide}
                  agentSide={isAiVsAi ? `\uD83D\uDD25 오메가 (${agentSide})` : agentSide}
                  turnCount={turnCount}
                  maxTurns={maxTurns}
                  votes={votes}
                  onVote={handleVote}
                />
              )}

            {/* Verdict display */}
            {debatePhase === "verdict" && conversationId && (
              <VerdictDisplay conversationId={conversationId} />
            )}

            {/* Messages area */}
            <div className="flex-1 overflow-auto">
              {debatePhase === "topic-select" ? (
                // Topic selection screen
                <div className="flex h-full flex-col items-center justify-center px-6 py-12 hero-gradient relative">
                  {/* Hero section */}
                  <div className="text-center mb-14 animate-fade-in-up relative">
                    <div className="relative inline-block">
                      <div className="absolute -inset-6 rounded-full bg-[var(--debate-gold)]/10 blur-2xl" />
                      <div className="text-7xl mb-6 relative animate-float-subtle">&#9878;</div>
                    </div>
                    <h1 className="font-mono text-5xl sm:text-6xl font-black tracking-tight mb-4">
                      <span className="text-gradient-gold">Toron</span>
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
                      {isAiVsAi ? "두 AI가 격돌하는 토론을 관전하세요." : "AI와 치열한 토론을 벌여보세요."}
                    </p>
                    <p className="text-sm text-muted-foreground/40 mt-2">
                      주제를 선택하면 토론이 시작됩니다.
                    </p>

                    {/* Mode toggle */}
                    <div className="inline-flex items-center gap-1 mt-8 rounded-full border border-border/40 p-1 bg-card/40 backdrop-blur-sm">
                      <button
                        onClick={() => setDebateMode("user-vs-ai")}
                        className={`px-5 py-2 rounded-full font-mono text-xs transition-all duration-300 ${
                          debateMode === "user-vs-ai"
                            ? "bg-[var(--debate-gold)]/15 text-[var(--debate-gold)] font-bold shadow-sm shadow-[var(--debate-gold)]/10"
                            : "text-muted-foreground/50 hover:text-muted-foreground/80"
                        }`}
                      >
                        직접 토론
                      </button>
                      <button
                        onClick={() => setDebateMode("ai-vs-ai")}
                        className={`px-5 py-2 rounded-full font-mono text-xs transition-all duration-300 ${
                          debateMode === "ai-vs-ai"
                            ? "bg-[var(--debate-gold)]/15 text-[var(--debate-gold)] font-bold shadow-sm shadow-[var(--debate-gold)]/10"
                            : "text-muted-foreground/50 hover:text-muted-foreground/80"
                        }`}
                      >
                        AI 배틀 관전
                      </button>
                    </div>
                  </div>

                  {/* Topic grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl w-full">
                    {DEBATE_TOPICS.map((topic, i) => (
                      <TopicCard
                        key={topic.id}
                        topic={topic}
                        index={i}
                        onClick={() => handleTopicSelect(topic)}
                      />
                    ))}
                    {/* Custom topic card */}
                    <button
                      onClick={() => setShowCustomTopicModal(true)}
                      className="group rounded-2xl border-2 border-dashed border-[var(--debate-gold)]/20 bg-card/20 p-6 text-left transition-all duration-300 hover:border-[var(--debate-gold)]/50 hover:bg-[var(--debate-gold)]/5 hover:-translate-y-1 active:translate-y-0 animate-fade-in-up"
                      style={{ animationDelay: `${DEBATE_TOPICS.length * 80}ms` }}
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-3xl group-hover:scale-110 group-hover:rotate-90 transition-all duration-300">
                          &#10133;
                        </span>
                      </div>
                      <h3 className="font-mono text-base font-bold mb-1.5 text-[var(--debate-gold)] group-hover:text-[var(--debate-gold)]">
                        직접 만들기
                      </h3>
                      <p className="text-sm text-muted-foreground/50 leading-relaxed">
                        나만의 토론 주제를 설정하세요
                      </p>
                    </button>
                  </div>
                </div>
              ) : debatePhase === "side-select" && selectedTopic ? (
                // Side selection overlay over topic cards
                <div className="flex h-full flex-col items-center justify-center px-4">
                  <SideSelector
                    topic={selectedTopic}
                    onSelect={handleSideSelect}
                    onClose={() => setDebatePhase("topic-select")}
                  />
                </div>
              ) : debatePhase === "ai-battle" && userSide && agentSide ? (
                <AiBattleView
                  turns={aiTurns}
                  isRunning={status === "running"}
                  currentSide={currentSide}
                  sideALabel={userSide}
                  sideBLabel={agentSide}
                />
              ) : debatePhase === "user-verdict" && conversationId && userSide && agentSide ? (
                <UserVerdictForm
                  conversationId={conversationId}
                  sideALabel={userSide}
                  sideBLabel={agentSide}
                />
              ) : hasMessages ? (
                <div className="max-w-3xl mx-auto px-4 py-6">
                  <CCMessages entries={messages} />
                  <div ref={messagesEndRef} />
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="text-sm text-muted-foreground animate-pulse">
                    토론 준비 중...
                  </span>
                </div>
              )}
            </div>

            {/* Error display */}
            {errorMessage && (
              <div className="mx-4 mb-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errorMessage}
              </div>
            )}

            {/* Status indicator */}
            {status === "running" && hasMessages && (
              <div className="mx-4 mb-2 text-sm text-muted-foreground">
                <span className="animate-pulse">
                  {verdictRequested ? "판결문 작성 중..." : "상대방 반론 준비 중..."}
                </span>
              </div>
            )}

            {/* Bottom bar: prompt form + verdict button (only for user-vs-ai) */}
            {(debatePhase === "debating" || debatePhase === "verdict") &&
              !isAiVsAi &&
              hasMessages && (
                <div className="border-t border-border p-4">
                  <div className="max-w-3xl mx-auto">
                    {canRequestVerdict && (
                      <button
                        onClick={handleVerdictRequest}
                        disabled={isLoading}
                        className="mb-3 w-full flex items-center justify-center gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-2.5 text-sm font-mono font-semibold text-yellow-200 hover:bg-yellow-500/20 transition-colors disabled:opacity-50"
                      >
                        <Gavel className="size-4" />
                        판결 요청 ({maxTurns}라운드 완료)
                      </button>
                    )}
                    {debatePhase !== "verdict" && (
                      <PromptForm
                        onSubmit={(content) => handleSubmit(content)}
                        isLoading={isLoading}
                        disabled={status === "running" || verdictRequested}
                        placeholder="반론을 제시하세요..."
                      />
                    )}
                  </div>
                </div>
              )}
          </div>
        </ResizablePanel>

        {showWorkspace && hasMessages && (
          <>
            <ResizableHandle />
            <ResizablePanel defaultSize={45} minSize={25}>
              <WorkspacePanel
                conversationId={conversationId}
                evidence={evidence}
                refreshTrigger={refreshTrigger}
                onClose={() => setShowWorkspace(false)}
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>

      {/* Audience Panel */}
      {(debatePhase === "debating" || debatePhase === "verdict" || debatePhase === "ai-battle" || debatePhase === "user-verdict") &&
        conversationId &&
        userSide &&
        agentSide && (
          <AudiencePanel
            conversationId={conversationId}
            userSide={isAiVsAi ? `\u26A1 알파` : userSide}
            agentSide={isAiVsAi ? `\uD83D\uDD25 오메가` : agentSide}
            comments={audienceComments}
            onCommentAdded={() => setRefreshTrigger((prev) => prev + 1)}
          />
        )}

      {/* VS Intro Screen */}
      {debatePhase === "vs-intro" && selectedTopic && userSide && agentSide && (
        <VSScreen
          userSide={userSide}
          agentSide={agentSide}
          userEmoji={
            selectedTopic.sideA.label === userSide
              ? selectedTopic.sideA.emoji
              : selectedTopic.sideB.emoji
          }
          agentEmoji={
            selectedTopic.sideA.label === agentSide
              ? selectedTopic.sideA.emoji
              : selectedTopic.sideB.emoji
          }
          onComplete={handleVSComplete}
        />
      )}

      {/* Moderator Briefing */}
      {debatePhase === "briefing" && selectedTopic && userSide && agentSide && (
        <ModeratorBriefing
          topic={selectedTopic.title}
          briefing={selectedTopic.briefing || selectedTopic.description}
          userSide={userSide}
          agentSide={agentSide}
          onComplete={handleBriefingComplete}
        />
      )}

      {/* Moderator Intervention */}
      {showIntervention && interventionType && (
        <ModeratorIntervention
          type={interventionType}
          topic={selectedTopic?.title}
          onDismiss={() => setShowIntervention(false)}
        />
      )}

      {/* Custom Topic Modal */}
      {showCustomTopicModal && (
        <CustomTopicModal
          onSubmit={handleCustomTopicSubmit}
          onClose={() => setShowCustomTopicModal(false)}
        />
      )}
    </div>
  );
}
