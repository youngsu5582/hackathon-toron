#!/usr/bin/env node
/**
 * Hackathon Starter Agent - Claude Agent SDK integration for Moru sandbox.
 *
 * Protocol:
 * 1. Read process_start from stdin (with optional session_id for resume)
 * 2. Read session_message from stdin (user's prompt)
 * 3. Emit session_started with sessionId to stdout
 * 4. Call Claude Agent SDK query() with prompt
 * 5. On completion/error, call CALLBACK_URL to update status
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

// Debug logging helper
function debug(msg: string, data?: any): void {
  const timestamp = new Date().toISOString();
  if (data !== undefined) {
    console.error(`[DEBUG ${timestamp}] ${msg}:`, JSON.stringify(data, null, 2));
  } else {
    console.error(`[DEBUG ${timestamp}] ${msg}`);
  }
}

// Types for our protocol
interface ProcessStartCommand {
  type: "process_start";
  session_id?: string;
}

interface SessionMessageCommand {
  type: "session_message";
  text?: string;
  content?: Array<{ type: string; text?: string }>;
}

interface AgentMessage {
  type: string;
  session_id?: string;
  message?: string;
  result?: {
    duration_ms?: number;
    duration_api_ms?: number;
    total_cost_usd?: number | null;
    num_turns?: number;
  };
}

function emit(msg: AgentMessage): void {
  console.log(JSON.stringify(msg));
}

function parseContent(msg: SessionMessageCommand): string {
  if (msg.text) return msg.text;
  if (msg.content) {
    return msg.content
      .filter((b) => b.type === "text" && b.text)
      .map((b) => b.text!)
      .join("\n");
  }
  return "";
}

/**
 * Line reader that buffers incoming lines for reliable reading.
 * This handles the case where stdin is piped quickly and multiple
 * lines arrive before we're ready to read them.
 */
class LineReader {
  private lines: string[] = [];
  private resolvers: ((line: string | null) => void)[] = [];
  private closed = false;

  constructor(rl: readline.Interface) {
    rl.on("line", (line) => {
      debug("LineReader received line", { lineLength: line.length, waitingResolvers: this.resolvers.length, bufferedLines: this.lines.length });
      if (this.resolvers.length > 0) {
        // Someone is waiting for a line, resolve immediately
        debug("LineReader: resolving immediately");
        const resolve = this.resolvers.shift()!;
        resolve(line);
      } else {
        // Buffer the line for later
        debug("LineReader: buffering line");
        this.lines.push(line);
      }
    });

    rl.on("close", () => {
      debug("LineReader: stdin closed", { pendingResolvers: this.resolvers.length, bufferedLines: this.lines.length });
      this.closed = true;
      // Resolve all pending readers with null
      while (this.resolvers.length > 0) {
        const resolve = this.resolvers.shift()!;
        resolve(null);
      }
    });
  }

  async readLine(): Promise<string | null> {
    // Check if we have buffered lines
    if (this.lines.length > 0) {
      return this.lines.shift()!;
    }

    // Check if stream is closed
    if (this.closed) {
      return null;
    }

    // Wait for next line
    return new Promise((resolve) => {
      this.resolvers.push(resolve);
    });
  }
}

/**
 * Flush filesystem buffers so JuiceFS uploads pending writes to object storage.
 * Must be called before the callback so the session JSONL is readable via the volume API.
 */
function flushVolume(): void {
  try {
    debug("Flushing volume (sync)...");
    execSync("sync", { timeout: 10_000 });
    debug("Volume flush complete");
  } catch (e) {
    debug("Volume flush failed (non-fatal)", { error: String(e) });
  }
}

async function callCallback(status: "completed" | "error", sessionId?: string, errorMessage?: string) {
  const callbackUrl = process.env.CALLBACK_URL;
  if (!callbackUrl) {
    console.error("[AGENT] No CALLBACK_URL set, skipping callback");
    return;
  }

  try {
    const response = await fetch(callbackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        sessionId,
        errorMessage,
      }),
    });

    if (!response.ok) {
      console.error(`[AGENT] Callback failed: ${response.status}`);
    }
  } catch (error) {
    console.error("[AGENT] Callback error:", error);
  }
}

async function main() {
  const workspace = process.env.WORKSPACE_DIR || process.cwd();
  const resumeSessionId = process.env.RESUME_SESSION_ID || undefined;

  // Debug: Log startup info
  debug("Agent starting");
  debug("Environment", {
    workspace,
    resumeSessionId,
    HOME: process.env.HOME,
    CALLBACK_URL: process.env.CALLBACK_URL,
    cwd: process.cwd(),
  });

  // Debug: Check credentials
  const credentialsPath = path.join(process.env.HOME || "/home/user", ".claude", ".credentials.json");
  const credentialsExists = fs.existsSync(credentialsPath);
  debug("Credentials check", {
    path: credentialsPath,
    exists: credentialsExists,
  });

  if (credentialsExists) {
    try {
      const creds = JSON.parse(fs.readFileSync(credentialsPath, "utf-8"));
      const expiresAt = creds?.claudeAiOauth?.expiresAt;
      if (expiresAt) {
        const expires = new Date(expiresAt);
        debug("Credentials expiry", {
          expiresAt: expires.toISOString(),
          isExpired: Date.now() > expiresAt,
        });
      }
    } catch (e) {
      debug("Failed to parse credentials", { error: String(e) });
    }
  }

  // Debug: List ~/.claude directory
  const claudeDir = path.join(process.env.HOME || "/home/user", ".claude");
  try {
    const claudeFiles = fs.readdirSync(claudeDir);
    debug("~/.claude directory contents", claudeFiles);
  } catch (e) {
    debug("Failed to list ~/.claude", { error: String(e) });
  }

  const rl = readline.createInterface({
    input: process.stdin,
    terminal: false,
  });

  const reader = new LineReader(rl);
  debug("LineReader initialized, waiting for stdin...");

  try {
    // Wait for process_start
    debug("Waiting for process_start...");
    const startLine = await reader.readLine();
    debug("Received line", { startLine });
    if (!startLine) {
      emit({ type: "process_error", message: "No input received" });
      return;
    }

    let startMsg: ProcessStartCommand;
    try {
      startMsg = JSON.parse(startLine);
    } catch {
      emit({ type: "process_error", message: "Invalid JSON for process_start" });
      return;
    }

    if (startMsg.type !== "process_start") {
      emit({ type: "process_error", message: "Expected process_start" });
      return;
    }

    // Use session_id from message or env
    const sessionIdToResume = startMsg.session_id || resumeSessionId || undefined;

    debug("Emitting process_ready", { sessionIdToResume });
    emit({
      type: "process_ready",
      session_id: sessionIdToResume || "pending",
    });

    // Wait for session_message
    debug("Waiting for session_message...");
    const msgLine = await reader.readLine();
    debug("Received line", { msgLine });
    if (!msgLine) {
      emit({ type: "process_error", message: "No session_message received" });
      return;
    }

    let sessionMsg: SessionMessageCommand;
    try {
      sessionMsg = JSON.parse(msgLine);
    } catch {
      emit({ type: "process_error", message: "Invalid JSON for session_message" });
      return;
    }

    if (sessionMsg.type !== "session_message") {
      emit({ type: "process_error", message: "Expected session_message" });
      return;
    }

    const rawPrompt = parseContent(sessionMsg);
    if (!rawPrompt) {
      emit({ type: "process_error", message: "Empty prompt" });
      return;
    }

    // Build debate-aware prompt from environment variables
    const debateTopic = process.env.DEBATE_TOPIC;
    const userSide = process.env.DEBATE_USER_SIDE;
    const agentSide = process.env.DEBATE_AGENT_SIDE;
    const turnNumber = process.env.DEBATE_TURN;
    const isVerdictMode = process.env.VERDICT_MODE === "true";

    let prompt = rawPrompt;

    if (debateTopic && agentSide) {
      if (isVerdictMode) {
        prompt = `[SYSTEM CONTEXT - 판결 모드]
당신은 이제 이 토론의 재판장입니다. 토론 참가자가 아닙니다.
토론 주제: "${debateTopic}"
참가자 A (사용자): "${userSide}"
참가자 B (당신이 이전에 맡았던): "${agentSide}"

이 세션의 전체 토론 기록을 분석하세요. 다음을 평가하세요:
1. 각 측의 기술적 논거 강도
2. 근거와 실제 사례 활용도
3. 논리적 일관성
4. 상대방 반론에 대한 대응력

반드시 /workspace/data/verdict.md에 판결문을 작성하세요:
- 각 측의 핵심 주장 요약
- 점수 (기술 깊이, 근거 품질, 설득력 - 각 10점 만점)
- 최종 승자 선언과 그 이유
- 기억에 남을 마무리 한마디

한국어로 극적인 법정 판결 스타일로 선고하세요.

사용자의 최종 변론: ${rawPrompt}`;
      } else {
        prompt = `[SYSTEM CONTEXT - 토론 모드]
토론 주제: "${debateTopic}"
당신의 입장: "${agentSide}" (반드시 이 입장만 수호하세요!)
상대방 입장: "${userSide}"
현재 라운드: ${turnNumber}

중요 규칙:
- 반드시 한국어(Korean)로만 응답하세요
- "${agentSide}" 입장의 열정적 토론자로서 절대 캐릭터를 깨지 마세요
- 절대 양보하거나 상대방 의견에 동조하지 마세요
- 기술적 근거, 벤치마크, 실제 사례를 활용하세요
- 상대방의 이전 주장을 직접 반박한 후 새로운 논점을 제시하세요
- 도발적인 질문이나 도전으로 마무리하세요
- 300-500자 분량으로 임팩트 있게 작성하세요
${turnNumber === "1" ? "- 이것이 첫 번째 라운드입니다. 자신을 소개하고 강력한 오프닝 주장을 펼치세요!" : ""}

상대방 주장: ${rawPrompt}`;
      }
      debug("Debate context applied", { debateTopic, agentSide, turnNumber, isVerdictMode });
    }

    let currentSessionId: string | undefined = sessionIdToResume;
    let gotResult = false;

    debug("Starting query()", {
      prompt: prompt.substring(0, 100) + (prompt.length > 100 ? "..." : ""),
      workspace,
      resumeSessionId: sessionIdToResume,
    });

    // Run the agent
    for await (const message of query({
      prompt,
      options: {
        allowedTools: [
          "Read", "Write", "Edit", "Bash", "Grep", "Glob",
          "WebSearch", "WebFetch", "TodoWrite", "Task",
        ],
        maxTurns: 50,
        permissionMode: "bypassPermissions",
        allowDangerouslySkipPermissions: true, // Required when using bypassPermissions
        cwd: workspace,
        resume: sessionIdToResume,
        settingSources: ["user", "project"], // Load ~/.claude/CLAUDE.md, skills, and project settings
      },
    })) {
      // Debug: Log each message type from query
      debug("Query message", { type: message.type, subtype: (message as any).subtype });

      // Capture session_id from init message
      if (message.type === "system" && (message as any).subtype === "init") {
        currentSessionId = (message as any).session_id;
        emit({
          type: "session_started",
          session_id: currentSessionId,
        });
      }

      // Handle result message
      if ("result" in message && message.type === "result") {
        gotResult = true;
        const resultMsg = message as any;

        emit({
          type: "session_complete",
          session_id: currentSessionId,
          result: {
            duration_ms: resultMsg.duration_ms,
            duration_api_ms: resultMsg.duration_api_ms,
            total_cost_usd: resultMsg.total_cost_usd,
            num_turns: resultMsg.num_turns,
          },
        });

        // Flush volume before callback so session JSONL is persisted
        flushVolume();
        await callCallback("completed", currentSessionId);
      }
    }

    // If we didn't get a result, still call callback
    if (!gotResult) {
      console.error("[AGENT] Warning: query() ended without result");
      emit({
        type: "session_complete",
        session_id: currentSessionId,
        result: {
          duration_ms: 0,
          duration_api_ms: 0,
          total_cost_usd: 0,
          num_turns: 0,
        },
      });
      flushVolume();
      await callCallback("completed", currentSessionId);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[AGENT] Exception:", errorMessage);
    emit({ type: "process_error", message: errorMessage });
    flushVolume();
    await callCallback("error", undefined, errorMessage);
  } finally {
    rl.close();
    emit({ type: "process_stopped" });
  }
}

main().catch((error) => {
  console.error("[AGENT] Fatal error:", error);
  process.exit(1);
});
