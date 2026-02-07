import type {
  SessionEntry,
  Evidence,
  SearchLink,
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
 * Parse WebSearch result text to extract structured links.
 *
 * WebSearch results come in formats like:
 *   Links: [{"title":"...","url":"..."},{"title":"...","url":"..."}]
 * or:
 *   [{"title":"...","url":"...","snippet":"..."}]
 */
function parseSearchLinks(text: string): SearchLink[] {
  const links: SearchLink[] = [];

  // Try to find JSON array of links in the text
  // Pattern 1: Links: [{...}]
  // Pattern 2: just [{...}] somewhere in the text
  const jsonArrayMatch = text.match(/\[[\s\S]*?\{[\s\S]*?"title"[\s\S]*?"url"[\s\S]*?\}[\s\S]*?\]/);
  if (jsonArrayMatch) {
    try {
      const parsed = JSON.parse(jsonArrayMatch[0]);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item.title && item.url) {
            links.push({
              title: String(item.title),
              url: String(item.url),
              snippet: item.snippet ? String(item.snippet) : undefined,
            });
          }
        }
      }
    } catch {
      // JSON parse failed, try regex fallback
    }
  }

  // Fallback: extract individual {"title":"...","url":"..."} objects
  if (links.length === 0) {
    const objectPattern = /\{"title":"([^"]+)","url":"([^"]+)"(?:,"snippet":"([^"]*)")?\}/g;
    let match;
    while ((match = objectPattern.exec(text)) !== null) {
      links.push({
        title: match[1],
        url: match[2],
        snippet: match[3] || undefined,
      });
    }
  }

  return links;
}

/**
 * Get a clean summary from WebSearch result text (without raw JSON).
 */
function getSearchSummary(text: string): string {
  // Extract the query description line
  const queryMatch = text.match(/^Web search results for query: "(.+?)"/m);
  const queryLine = queryMatch ? `"${queryMatch[1]}" 검색 결과` : "";

  // Remove raw JSON links array from the text for a cleaner summary
  const cleaned = text
    .replace(/Links:\s*\[[\s\S]*?\]/, "")
    .replace(/\[[\s\S]*?\{[\s\S]*?"title"[\s\S]*?\}[\s\S]*?\]/, "")
    .trim();

  // Return remaining non-JSON text or the query line
  return cleaned || queryLine;
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
          const links = parseSearchLinks(resultText);
          const summary = getSearchSummary(resultText);
          evidence.push({
            id: toolUse.id,
            type: "web-search",
            title: `검색: ${query}`,
            content: summary,
            links: links.length > 0 ? links : undefined,
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
          let hostname: string;
          try {
            hostname = new URL(url).hostname;
          } catch {
            hostname = url;
          }
          evidence.push({
            id: toolUse.id,
            type: "web-fetch",
            title: `웹 참조: ${hostname}`,
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
          // Skip commands that are ONLY simple utilities (no chaining with &&, ||, |, ;)
          const trimmedCmd = command.trim();
          const isChainedCommand = /[&|;]/.test(trimmedCmd);
          const isSoloSimpleCommand = !isChainedCommand &&
            /^(ls|pwd|echo|cat|mkdir|which|sync|cd)\b/.test(trimmedCmd);
          if (isSoloSimpleCommand) break;
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
