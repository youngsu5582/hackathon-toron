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
import { DEBATE_TOPICS, type DebateTopic } from "@/lib/debate-topics";
import type { SessionEntry, ConversationResponse } from "@/lib/types";
import { PanelRight, Gavel } from "lucide-react";

// Pending message type for optimistic UI
interface PendingMessage {
  id: string;
  content: string;
  timestamp: string;
}

type DebatePhase = "topic-select" | "side-select" | "debating" | "verdict";

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
  const [maxTurns, setMaxTurns] = useState(3);
  const [votes, setVotes] = useState<{ user: number; agent: number }>({
    user: 0,
    agent: 0,
  });
  const [verdictRequested, setVerdictRequested] = useState(false);

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
  const hasPendingMatch = useCallback(
    (pending: PendingMessage, serverMsgs: SessionEntry[]) => {
      return serverMsgs.some(
        (m) =>
          m.type === "user" &&
          getUserMessageText(m.message.content) === pending.content
      );
    },
    [getUserMessageText]
  );

  // Polling for conversation updates
  useEffect(() => {
    if (!conversationId) return;

    const isDone = status === "completed" || status === "error";

    if (
      isDone &&
      (pendingMessages.length === 0 || postCompletionPollsRef.current >= 10)
    )
      return;
    if (!isDone && status !== "running") return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/conversations/${conversationId}`);
        if (response.ok) {
          const data: ConversationResponse = await response.json();

          setServerMessages(data.messages);

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

          // Detect verdict completion
          if (
            verdictRequested &&
            (data.status === "completed" || data.status === "error")
          ) {
            setDebatePhase("verdict");
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [
    conversationId,
    status,
    pendingMessages.length,
    hasPendingMatch,
    verdictRequested,
  ]);

  // Compute combined messages
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
  ];

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
    setDebatePhase("side-select");
  }, []);

  const handleSideSelect = useCallback(
    (selectedUserSide: string, selectedAgentSide: string) => {
      setUserSide(selectedUserSide);
      setAgentSide(selectedAgentSide);
      setDebatePhase("debating");

      // Auto-send the first debate message
      handleSubmit(
        `나는 "${selectedUserSide}" 입장을 지지합니다. 당신의 첫 번째 주장을 펼쳐보세요!`
      );
    },
    [handleSubmit]
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
  const hasMessages = messages.length > 0;
  const canRequestVerdict =
    turnCount >= maxTurns && !verdictRequested && debatePhase === "debating";

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-4 h-[52px]">
        <div className="flex items-center gap-2">
          <span className="text-lg">&#9878;</span>
          <span className="font-mono text-sm font-medium">
            기술 맞짱: 아키텍처 법정
          </span>
        </div>
        <div className="flex items-center gap-2">
          {debatePhase !== "topic-select" &&
            debatePhase !== "side-select" &&
            selectedTopic && (
              <span className="text-xs text-muted-foreground font-mono">
                {selectedTopic.title}
              </span>
            )}
          {!showWorkspace && hasMessages && (
            <button
              onClick={() => setShowWorkspace(true)}
              className="p-1.5 hover:bg-muted rounded transition-colors"
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
            {/* Debate header bar (during debate) */}
            {debatePhase === "debating" &&
              userSide &&
              agentSide &&
              selectedTopic && (
                <DebateHeader
                  topic={selectedTopic.title}
                  userSide={userSide}
                  agentSide={agentSide}
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
                <div className="flex h-full flex-col items-center justify-center px-4">
                  <div className="text-4xl mb-3">&#9878;</div>
                  <h1 className="font-mono text-xl font-bold mb-1">
                    기술 맞짱
                  </h1>
                  <p className="text-sm text-muted-foreground mb-8">
                    아키텍처 법정에 오신 것을 환영합니다. 주제를 선택하세요.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl w-full">
                    {DEBATE_TOPICS.map((topic, i) => (
                      <TopicCard
                        key={topic.id}
                        topic={topic}
                        index={i}
                        onClick={() => handleTopicSelect(topic)}
                      />
                    ))}
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

            {/* Bottom bar: prompt form + verdict button */}
            {(debatePhase === "debating" || debatePhase === "verdict") &&
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
                        판결 요청 (3라운드 완료)
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
                refreshTrigger={refreshTrigger}
                onClose={() => setShowWorkspace(false)}
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
