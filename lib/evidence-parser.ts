import type {
  SessionEntry,
  Evidence,
  ToolUseBlock,
  ToolResultBlock,
  ContentBlock,
} from "./types";
import { isAssistantMessage, isUserMessage, isToolUseBlock, isToolResultBlock } from "./types";

/**
 * Extract text content from a tool result block.
 */
function getToolResultText(result: ToolResultBlock): string {
  if (typeof result.content === "string") return result.content;
  if (Array.isArray(result.content)) {
    return result.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map((b) => b.text)
      .join("\n");
  }
  return "";
}

/**
 * Extract evidence items from session entries by analyzing tool_use + tool_result pairs.
 */
export function extractEvidence(entries: SessionEntry[]): Evidence[] {
  const evidence: Evidence[] = [];

  // Build a map of tool_use_id -> tool_result
  const toolResults = new Map<string, ToolResultBlock>();
  for (const entry of entries) {
    if (!isUserMessage(entry)) continue;
    const content = entry.message.content;
    if (typeof content === "string") continue;
    for (const block of content) {
      if (isToolResultBlock(block)) {
        toolResults.set(block.tool_use_id, block);
      }
    }
  }

  // Scan assistant messages for tool_use blocks
  for (const entry of entries) {
    if (!isAssistantMessage(entry)) continue;
    const content: ContentBlock[] = entry.message.content;

    for (const block of content) {
      if (!isToolUseBlock(block)) continue;

      const toolUse = block as ToolUseBlock;
      const result = toolResults.get(toolUse.id);
      const resultText = result ? getToolResultText(result) : "";

      switch (toolUse.name) {
        case "WebSearch": {
          const query = (toolUse.input as { query?: string }).query || "";
          if (!query) break;
          evidence.push({
            id: toolUse.id,
            type: "web-search",
            title: `검색: ${query}`,
            content: resultText.slice(0, 2000),
            query,
            isError: result?.is_error,
            timestamp: entry.timestamp,
          });
          break;
        }

        case "WebFetch": {
          const url = (toolUse.input as { url?: string }).url || "";
          const prompt = (toolUse.input as { prompt?: string }).prompt || "";
          if (!url) break;
          evidence.push({
            id: toolUse.id,
            type: "web-fetch",
            title: `웹 참조: ${new URL(url).hostname}`,
            content: resultText.slice(0, 3000),
            url,
            query: prompt,
            isError: result?.is_error,
            timestamp: entry.timestamp,
          });
          break;
        }

        case "Bash": {
          const command = (toolUse.input as { command?: string }).command || "";
          if (!command) break;
          // Skip simple utility commands
          if (/^(cd|ls|pwd|echo|cat|mkdir|which|sync)\b/.test(command.trim())) break;
          evidence.push({
            id: toolUse.id,
            type: "bash",
            title: `코드 실행`,
            content: resultText.slice(0, 3000),
            command,
            isError: result?.is_error,
            timestamp: entry.timestamp,
          });
          break;
        }

        case "Write": {
          const filePath = (toolUse.input as { file_path?: string }).file_path || "";
          const fileContent = (toolUse.input as { content?: string }).content || "";
          if (!filePath) break;
          // Skip .claude internal files
          if (filePath.includes(".claude/")) break;
          const fileName = filePath.split("/").pop() || filePath;
          evidence.push({
            id: toolUse.id,
            type: "code-write",
            title: `파일 작성: ${fileName}`,
            content: fileContent.slice(0, 3000),
            filePath,
            isError: result?.is_error,
            timestamp: entry.timestamp,
          });
          break;
        }
      }
    }
  }

  return evidence;
}
