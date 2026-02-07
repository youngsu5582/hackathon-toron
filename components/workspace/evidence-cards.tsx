"use client";

import { useState, memo } from "react";
import {
  Search,
  Globe,
  Terminal,
  FileCode,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  AlertCircle,
  Link as LinkIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Evidence, SearchLink } from "@/lib/types";

interface EvidenceCardsProps {
  evidence: Evidence[];
}

function EvidenceIcon({ type }: { type: Evidence["type"] }) {
  switch (type) {
    case "web-search":
      return <Search className="size-3.5" />;
    case "web-fetch":
      return <Globe className="size-3.5" />;
    case "bash":
      return <Terminal className="size-3.5" />;
    case "code-write":
      return <FileCode className="size-3.5" />;
  }
}

function EvidenceLabel({ type }: { type: Evidence["type"] }) {
  switch (type) {
    case "web-search":
      return "검색";
    case "web-fetch":
      return "웹 참조";
    case "bash":
      return "실행";
    case "code-write":
      return "파일";
  }
}

/**
 * Render a single search result link as a card.
 */
function SearchLinkCard({ link }: { link: SearchLink }) {
  let hostname = "";
  try {
    hostname = new URL(link.url).hostname.replace("www.", "");
  } catch {
    hostname = link.url;
  }

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-1 rounded-md border border-border/40 bg-muted/20 px-2.5 py-2 hover:border-[var(--debate-gold)]/40 hover:bg-[var(--debate-gold)]/5 transition-colors"
    >
      <div className="flex items-start gap-1.5">
        <LinkIcon className="size-3 mt-0.5 shrink-0 text-[var(--debate-gold)]/60 group-hover:text-[var(--debate-gold)]" />
        <span className="text-[11px] font-medium leading-tight text-foreground/90 group-hover:text-[var(--debate-gold)]">
          {link.title}
        </span>
      </div>
      <span className="text-[10px] text-muted-foreground/50 truncate pl-4.5">
        {hostname}
      </span>
      {link.snippet && (
        <p className="text-[10px] text-muted-foreground/70 leading-relaxed line-clamp-2 pl-4.5">
          {link.snippet}
        </p>
      )}
    </a>
  );
}

/**
 * Render WebSearch evidence with parsed link cards.
 */
function WebSearchContent({ item }: { item: Evidence }) {
  if (item.links && item.links.length > 0) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="text-[10px] text-muted-foreground/50 mb-0.5">
          {item.links.length}개 결과
        </div>
        {item.links.map((link, i) => (
          <SearchLinkCard key={i} link={link} />
        ))}
      </div>
    );
  }

  // Fallback: show raw content if no links parsed
  return (
    <div className="text-muted-foreground/90 text-[11px] leading-relaxed max-h-[300px] overflow-auto whitespace-pre-wrap">
      {item.content}
    </div>
  );
}

/**
 * Render WebFetch evidence with URL and content preview.
 */
function WebFetchContent({ item }: { item: Evidence }) {
  return (
    <div className="flex flex-col gap-2">
      {item.url && (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[var(--debate-gold)]/80 hover:text-[var(--debate-gold)] transition-colors"
        >
          <ExternalLink className="size-3 shrink-0" />
          <span className="text-[11px] truncate">{item.url}</span>
        </a>
      )}
      {item.query && (
        <div className="text-[10px] text-muted-foreground/50">
          질문: {item.query}
        </div>
      )}
      {item.content && (
        <div className="rounded-md bg-muted/30 px-2.5 py-2 text-[11px] text-muted-foreground/90 leading-relaxed max-h-[300px] overflow-auto whitespace-pre-wrap">
          {item.content}
        </div>
      )}
    </div>
  );
}

/**
 * Render Bash execution evidence with command and output.
 */
function BashContent({ item }: { item: Evidence }) {
  // Try to extract meaningful command (after cd ... &&)
  const displayCommand = item.command || "";
  const shortCommand = displayCommand.length > 80
    ? displayCommand.slice(0, 80) + "..."
    : displayCommand;

  return (
    <div className="flex flex-col gap-2">
      {item.command && (
        <div>
          <div className="text-[10px] text-muted-foreground/50 mb-1">$ command</div>
          <pre className="rounded-md bg-muted/40 px-2.5 py-1.5 font-mono text-[10px] text-green-400/80 overflow-x-auto whitespace-pre-wrap break-all max-h-[100px] overflow-auto">
            {displayCommand}
          </pre>
        </div>
      )}
      {item.content && (
        <div>
          <div className="text-[10px] text-muted-foreground/50 mb-1">출력</div>
          <pre className={cn(
            "rounded-md bg-muted/40 px-2.5 py-1.5 font-mono text-[10px] max-h-[250px] overflow-auto whitespace-pre-wrap break-all",
            item.isError ? "text-red-400/80" : "text-foreground/80"
          )}>
            {item.content}
          </pre>
        </div>
      )}
    </div>
  );
}

/**
 * Render file write evidence.
 */
function FileWriteContent({ item }: { item: Evidence }) {
  return (
    <div className="flex flex-col gap-2">
      {item.filePath && (
        <div className="text-[10px] text-muted-foreground/60 font-mono truncate">
          {item.filePath}
        </div>
      )}
      {item.content && (
        <pre className="rounded-md bg-muted/40 px-2.5 py-1.5 font-mono text-[10px] max-h-[300px] overflow-auto whitespace-pre-wrap break-all text-foreground/80">
          {item.content}
        </pre>
      )}
    </div>
  );
}

function EvidenceCard({ item }: { item: Evidence }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Show link count for search results
  const extraInfo = item.type === "web-search" && item.links
    ? `${item.links.length}개`
    : null;

  return (
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-card/50 overflow-hidden transition-colors",
        "hover:border-[var(--debate-gold)]/30",
        item.isError && "border-destructive/40"
      )}
    >
      {/* Card header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/30 transition-colors"
      >
        <span className="text-[var(--debate-gold)]/80">
          <EvidenceIcon type={item.type} />
        </span>
        <span className="flex-1 truncate font-mono text-xs font-medium">
          {item.title}
        </span>
        {item.isError && (
          <AlertCircle className="size-3 text-destructive shrink-0" />
        )}
        {extraInfo && (
          <span className="text-[10px] text-muted-foreground/40 shrink-0">
            {extraInfo}
          </span>
        )}
        <span className="text-[10px] text-muted-foreground/60 shrink-0">
          <EvidenceLabel type={item.type} />
        </span>
        {isExpanded ? (
          <ChevronDown className="size-3 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="size-3 text-muted-foreground shrink-0" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border/40 px-3 py-2.5">
          {item.type === "web-search" && <WebSearchContent item={item} />}
          {item.type === "web-fetch" && <WebFetchContent item={item} />}
          {item.type === "bash" && <BashContent item={item} />}
          {item.type === "code-write" && <FileWriteContent item={item} />}
        </div>
      )}
    </div>
  );
}

function EvidenceCardsComponent({ evidence }: EvidenceCardsProps) {
  if (evidence.length === 0) return null;

  // Group by type
  const searchItems = evidence.filter((e) => e.type === "web-search");
  const fetchItems = evidence.filter((e) => e.type === "web-fetch");
  const bashItems = evidence.filter((e) => e.type === "bash");
  const writeItems = evidence.filter((e) => e.type === "code-write");

  const groups = [
    { label: "웹 검색", icon: Search, items: searchItems },
    { label: "웹 참조", icon: Globe, items: fetchItems },
    { label: "코드 실행", icon: Terminal, items: bashItems },
    { label: "파일 작성", icon: FileCode, items: writeItems },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
        <span className="font-mono font-medium">
          증거 자료 ({evidence.length}건)
        </span>
      </div>
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50 uppercase tracking-wider">
            <group.icon className="size-3" />
            {group.label} ({group.items.length})
          </div>
          {group.items.map((item) => (
            <EvidenceCard key={item.id} item={item} />
          ))}
        </div>
      ))}
    </div>
  );
}

export const EvidenceCards = memo(EvidenceCardsComponent);
