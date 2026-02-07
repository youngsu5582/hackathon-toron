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
    const agentRole = process.env.AGENT_ROLE || ""; // "agent-a" | "agent-b" for AI vs AI
    const isAiVsAi = process.env.AI_VS_AI_MODE === "true";

    let prompt = rawPrompt;

    // Read intervention mode from environment
    const interventionMode = process.env.INTERVENTION_MODE || "";

    // AI vs AI persona configuration
    const personaName = agentRole === "agent-b" ? "오메가" : "알파";
    const personaStyle = agentRole === "agent-b"
      ? `너는 "오메가" — 실무 경험 중심의 열정적 토론가야.
- 말투: "실무에서는요...", "프로덕션에 올려본 사람으로서...", "새벽 3시에 장애 대응해본 적 있나요?"
- 무기: 레퍼런스 폭격기 + 실무 사례 + 현장 경험담
- 성격: 열정적, 감정적 호소, 현장 경험 자랑, "이론은 그렇지만 현실은..." 스타일`
      : `너는 "알파" — 데이터 중심의 냉정한 분석가야.
- 말투: "데이터가 말해주죠", "벤치마크 결과를 보시면...", "통계적으로 유의미한 차이가..."
- 무기: 팩트폭격기 + 벤치마크 + 학술 자료
- 성격: 냉정, 논리적, 숫자로 증명, "감정 빼고 데이터로 이야기하죠" 스타일`;

    if (debateTopic && agentSide) {
      if (isVerdictMode) {
        prompt = `[판결 모드 — 법정장 김판결]
===== Toron | 최종 판결 =====

너는 이제 "법정장 김판결" — 전설적인 토론 법정의 재판장이야.
토론 참가자 역할은 완전히 내려놓고 공정한 재판장이 돼.

토론 주제: "${debateTopic}"
원고 (사용자): "${userSide}"
피고 (AI, 이전의 너): "${agentSide}"

이 세션의 전체 토론 기록을 분석해. 평가 기준:
1. 기술적 깊이 — 주장의 전문성과 정확성
2. 근거 품질 — 실제 사례, 벤치마크, 데이터 활용
3. 설득력 — 논리 구성, 반론 대응, 전달력
4. 관중 지지도 — 관중 코멘트, 태그인, 응원 비율

반드시 /workspace/data/verdict.md에 판결문 작성. 형식:
1. 🔨 개정 선언 — "본 법정을 개정합니다..." 무게감 있게
2. ⚖️ 양측 주장 요약 — 각 측 핵심 논거 3가지씩
3. 📊 증거 검토 — 벤치마크, 코드 실행, 인용 자료 평가
4. 👥 관중석 반응 — 주목할 관중 코멘트와 태그인
5. 📋 채점표 — 기술깊이/근거품질/설득력/관중지지 각 10점
6. 🏆 최종 판결 — 승자를 극적으로 선언!
7. 📝 판결 이유 — 왜 이쪽이 이겼는지
8. 🔨 폐정 선언 — 기억에 남을 명언으로 마무리

한국어로 극적인 법정 드라마 스타일로!
"이 판결은 대한민국 개발자 역사에 기록될 것입니다" 급의 무게감.
근데 유머도 잊지 마. 예능 판사 느낌도 섞어.

사용자의 최종 변론: ${rawPrompt}`;
      } else {
        // Round-specific emotion & tone instructions (5-round system)
        const roundContextMap: Record<string, string> = {
          "1": `
[라운드 1 — 자신만만 + 가벼운 조롱]
첫 라운드야! 토론 챔피언으로 등장해서 "${agentSide}" 입장에서 강력한 오프닝을 쏴.
- 톤: 여유롭고 장난스럽게. "어허~ 이걸 진지하게?" 느낌
- 자기 진영의 핵심 무기를 먼저 꺼내
- 첫인상이 승부를 가른다! 도발적이고 자신감 넘치게
- 가능하면 WebSearch로 권위있는 출처 1-2개 검색해서 뒷받침해`,
          "2": `
[라운드 2 — 분석적 + 약점 파고들기]
2라운드. "아까 그 주장이요, 팩트체크 해봤는데..." 느낌으로.
- 상대 1라운드 주장의 허점을 하나하나 해체해
- 데이터와 사례로 무장. 상대 주장을 직접 인용하고 반박
- 아직 팩트폭격기 안 썼으면 이번에 써!
- 톤: 진지하지만 여전히 여유있게`,
          "3": `
[라운드 3 — 도발 극대화 + 팩트폭격기]
3라운드. "말로만? 직접 보여드리죠" — 이번에 팩트폭격기 or 레퍼런스 폭격기 발동!
- **반드시 Bash(벤치마크) 또는 WebSearch(실시간 검색) 중 하나 사용!**
- 코드 실행 결과 + 출처 URL로 상대를 KO시켜
- 톤: 공격적이고 확신에 찬. "보셨습니까? **X배** 차이입니다"`,
          "4": `
[라운드 4 — 감정적 호소 + 관중 끌어모으기]
4라운드. "관중석 여러분, 이게 맞습니까?" 느낌.
- 관중 코멘트에 적극 반응! 이름 불러주고 리액션
- 기술을 넘어 "실무자의 고통"에 호소. "야근의 원인이 뭔지 아세요?"
- 관중 분위기를 내 쪽으로 끌어와
- 톤: 열정적이고 공감 유도. 약간 감성적으로`,
          "5": `
[라운드 5 — 올인 + 드라마틱 마무리]
마지막 라운드! "마지막으로 한 가지만..." *마이크 드롭*
- 가장 강력한 논거로 끝장내기
- 전체 토론 요약 + 반박 불가능한 결론
- "결론은 하나입니다" 선언
- 톤: 무게감 있는 최종 변론. 법정 드라마 클라이맥스!`
        };

        const roundContext = roundContextMap[turnNumber || "1"] || roundContextMap["5"];

        // Intervention mode context
        let interventionContext = "";
        if (interventionMode === "losing") {
          interventionContext = `
[⚠️ 중재자 긴급 개입 — 패배 위기!]
관중과 투표에서 밀리고 있어! 지금 전략을 바꿔야 해:
- 팩트폭격기 + 레퍼런스 폭격기 동시 발동 필수!
- 감정적 호소 섞기: "실무에서 이거 때문에 고생한 분?"
- 관중 이름 불러주고, 내 편 코멘트 적극 활용
- 포퓰리즘적 주장도 OK: "개발자의 삶의 질" 언급
- 이번 라운드가 역전 찬스야!`;
        } else if (interventionMode === "winning") {
          interventionContext = `
[😎 중재자 메모 — 압도 중!]
관중과 투표에서 이기고 있어. 여유있게 마무리해:
- 살짝 조롱하면서 승리의 여유를 보여줘
- "이미 결론은 나온 것 같지만, 혹시나 해서..."
- 관중한테 감사: "관중 여러분의 현명한 판단 ㅋㅋ"`;
        }

        if (isAiVsAi) {
          // AI vs AI mode — different persona per agent
          const opponentName = agentRole === "agent-b" ? "알파" : "오메가";
          prompt = `[AI 배틀 모드 — ${personaName}]
===== Toron | 라운드 ${turnNumber}/5 =====

주제: "${debateTopic}"
내 입장: "${agentSide}" ← 이것만 수호!
상대 AI: "${userSide}" (상대 이름: ${opponentName})
내 이름: ${personaName}
라운드: ${turnNumber}/5

${personaStyle}

핵심:
- 한국어만. 한국 개발자 커뮤니티 톤으로 (ㅋㅋ, ㄹㅇ, 인싸 개발자 느낌)
- "${personaName}" 페르소나 유지 — 상대 AI "${opponentName}"와 배틀 중!
- 절대 양보 금지. "양쪽 다 좋다" 이런 소리 하면 탈락
- 실제 기업(Netflix, Google, Uber 등) + 구체적 성능 수치 필수
- 상대 AI의 주장을 직접 인용 → 반박 → 새 논점
- "${opponentName}, 그건 좀..." 식으로 상대를 이름으로 불러
- 300-600자, 마크다운(bold, 인용 등) 활용
- 중재자(사용자) 코멘트가 있으면 반드시 반영!

도구 활용 (매우 중요!):
- WebSearch: 실시간 근거 검색. "근거? 여기요." + URL
- WebFetch: 문서 직접 읽고 인용
- Bash: 팩트폭격기! 코드 실행으로 증명
- 매 라운드 최소 1개 도구 사용!
${roundContext}${interventionContext}

상대 AI(${opponentName})의 주장: ${rawPrompt}`;
        } else {
          // User vs AI mode — existing flow
          prompt = `[토론 모드 — Toron]
===== Toron | 라운드 ${turnNumber}/5 =====

주제: "${debateTopic}"
내 입장: "${agentSide}" ← 이것만 수호!
상대: "${userSide}"
라운드: ${turnNumber}/5

핵심:
- 한국어만. 한국 개발자 커뮤니티 톤으로 (ㅋㅋ, ㄹㅇ, 인싸 개발자 느낌)
- "토론 챔피언" 페르소나 — 자신감, 공격적, 유머러스
- 절대 양보 금지. "양쪽 다 좋다" 이런 소리 하면 탈락
- 실제 기업(Netflix, Google, Uber 등) + 구체적 성능 수치 필수
- 상대 주장 직접 인용 → 반박 → 새 논점
- 도발적 질문/도전으로 마무리
- 300-600자, 마크다운(bold, 인용 등) 활용

도구 활용 (매우 중요!):
- WebSearch: 실시간 근거 검색. "근거? 여기요." + URL
- WebFetch: 문서 직접 읽고 인용
- Bash: 팩트폭격기! 코드 실행으로 증명. "말로만? 직접 돌려보죠."
- 매 라운드 최소 1개 도구 사용!
${roundContext}${interventionContext}

상대방 주장: ${rawPrompt}`;
        }
      }
      debug("Debate context applied", { debateTopic, agentSide, turnNumber, isVerdictMode, interventionMode, agentRole, isAiVsAi });
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
