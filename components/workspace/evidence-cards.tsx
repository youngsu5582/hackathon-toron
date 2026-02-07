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
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Evidence } from "@/lib/types";

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

function EvidenceCard({ item }: { item: Evidence }) {
  const [isExpanded, setIsExpanded] = useState(false);

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
        <div className="border-t border-border/40 px-3 py-2 text-xs">
          {/* URL link for web-fetch */}
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-2 flex items-center gap-1 text-[var(--debate-gold)]/80 hover:text-[var(--debate-gold)] truncate"
            >
              <ExternalLink className="size-3 shrink-0" />
              <span className="truncate">{item.url}</span>
            </a>
          )}

          {/* Command for bash */}
          {item.command && (
            <div className="mb-2">
              <div className="text-[10px] text-muted-foreground/60 mb-1">
                Command
              </div>
              <pre className="rounded bg-muted/50 px-2 py-1.5 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap break-all">
                {item.command}
              </pre>
            </div>
          )}

          {/* File path for code-write */}
          {item.filePath && (
            <div className="mb-2 text-muted-foreground/80 font-mono truncate">
              {item.filePath}
            </div>
          )}

          {/* Content / output */}
          {item.content && (
            <div>
              {(item.type === "bash" || item.type === "code-write") && item.content ? (
                <pre className="rounded bg-muted/50 px-2 py-1.5 font-mono text-[11px] max-h-[300px] overflow-auto whitespace-pre-wrap break-all">
                  {item.content}
                </pre>
              ) : (
                <div className="text-muted-foreground/90 leading-relaxed max-h-[300px] overflow-auto whitespace-pre-wrap">
                  {item.content}
                </div>
              )}
            </div>
          )}
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
