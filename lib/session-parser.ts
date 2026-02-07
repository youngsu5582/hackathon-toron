import { SessionEntry, AssistantMessage, UserMessage } from "./types";

/**
 * Claude Code internal artifact texts that should not be shown to users.
 * These appear when Claude Code hits an internal stop sequence.
 */
const ARTIFACT_TEXTS = new Set([
  "No response requested.",
]);

/**
 * Check if an assistant message is a Claude Code internal artifact
 * that shouldn't be displayed to the user.
 */
function isInternalArtifact(entry: AssistantMessage): boolean {
  const content = entry.message.content;
  if (!content || content.length === 0) return true;

  // Check if the only content is a known artifact text (no tool_use blocks)
  const hasToolUse = content.some((b) => b.type === "tool_use");
  if (hasToolUse) return false;

  const textBlocks = content.filter((b) => b.type === "text");
  if (textBlocks.length !== 1) return false;

  const text = (textBlocks[0] as { type: "text"; text: string }).text.trim();
  return ARTIFACT_TEXTS.has(text);
}

/**
 * Strip debate system context from user message content,
 * keeping only the raw user text.
 *
 * Agent wraps user messages like:
 *   "[SYSTEM CONTEXT - 토론 모드]\n...\n상대방 주장: {raw text}"
 *   "[SYSTEM CONTEXT - 판결 모드 활성화]\n...\n사용자의 최종 변론: {raw text}"
 */
function stripDebateContext(text: string): string {
  // Debate mode: extract after "상대방 주장: "
  const debateMatch = text.match(/상대방 주장: ([\s\S]*)$/);
  if (debateMatch) return debateMatch[1].trim();

  // Verdict mode: extract after "사용자의 최종 변론: "
  const verdictMatch = text.match(/사용자의 최종 변론: ([\s\S]*)$/);
  if (verdictMatch) return verdictMatch[1].trim();

  return text;
}

/**
 * Clean user message content by stripping debate system context.
 */
function cleanUserMessageContent(entry: UserMessage): void {
  const content = entry.message.content;
  if (typeof content === "string") {
    if (content.includes("[SYSTEM CONTEXT")) {
      entry.message.content = stripDebateContext(content);
    }
  } else if (Array.isArray(content)) {
    for (const block of content) {
      if (
        "type" in block &&
        block.type === "text" &&
        "text" in block
      ) {
        const textBlock = block as { type: "text"; text: string };
        if (textBlock.text.includes("[SYSTEM CONTEXT")) {
          textBlock.text = stripDebateContext(textBlock.text);
        }
      }
    }
  }
}

/**
 * Parse Claude Code session JSONL file into session entries
 */
export function parseSessionJSONL(content: string): SessionEntry[] {
  const entries: SessionEntry[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      const entry = JSON.parse(trimmed);
      // Filter for user, assistant, and system messages
      if (
        entry.type === "user" ||
        entry.type === "assistant" ||
        entry.type === "system"
      ) {
        // Filter out Claude Code internal artifacts
        if (entry.type === "assistant" && isInternalArtifact(entry as AssistantMessage)) {
          continue;
        }
        // Strip debate system context from user messages
        if (entry.type === "user") {
          cleanUserMessageContent(entry as UserMessage);
        }
        entries.push(entry as SessionEntry);
      }
    } catch {
      // Skip invalid JSON lines
    }
  }

  return entries;
}

/**
 * Find the session JSONL file path from session ID
 *
 * Claude Code stores sessions at ~/.claude/projects/{project_hash}/{sessionId}.jsonl
 * where project_hash is the working directory path with slashes replaced by hyphens.
 *
 * Since the agent runs with cwd=/workspace/data, the project_hash is "-workspace-data".
 * With our setup: ~/.claude symlinked to /workspace/data/.claude
 * So the file is at /workspace/data/.claude/projects/-workspace-data/{sessionId}.jsonl
 */
export function getSessionFilePath(sessionId: string): string {
  return `.claude/projects/-workspace-data/${sessionId}.jsonl`;
}
