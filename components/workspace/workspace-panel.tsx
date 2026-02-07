"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { FileExplorer } from "./file-explorer";
import { FileViewer } from "./file-viewer";
import { EvidenceCards } from "./evidence-cards";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertTriangle, Loader2, PanelLeftClose, PanelLeft, X, FileText, Scale, FolderOpen } from "lucide-react";
import type { FileInfo, Evidence } from "@/lib/types";
import { cn } from "@/lib/utils";

type WorkspaceTab = "evidence" | "files";

interface WorkspacePanelProps {
  conversationId: string | null;
  evidence?: Evidence[];
  refreshTrigger?: number;
  onClose?: () => void;
}

function WorkspacePanelComponent({
  conversationId,
  evidence = [],
  refreshTrigger,
  onClose,
}: WorkspacePanelProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("evidence");
  const [isExplorerCollapsed, setIsExplorerCollapsed] = useState(false);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [selectedFileContent, setSelectedFileContent] = useState<string>("");
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);

  // File tree state
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isTreeLoading, setIsTreeLoading] = useState(false);
  const [treeError, setTreeError] = useState<string | null>(null);

  // Filter out .claude directory from files for display
  const visibleFiles = files.filter((f) => f.name !== ".claude");

  // Fetch file tree
  const fetchFileTree = useCallback(async () => {
    if (!conversationId) return;

    setIsTreeLoading(true);
    setTreeError(null);

    try {
      const response = await fetch(
        `/api/conversations/${conversationId}/files?path=/&tree=true`
      );
      if (!response.ok) {
        throw new Error("Failed to load file tree");
      }
      const data = await response.json();
      setFiles(data.files || []);
    } catch (err) {
      setTreeError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsTreeLoading(false);
    }
  }, [conversationId]);

  // Fetch file tree on mount and when refreshTrigger changes
  useEffect(() => {
    fetchFileTree();
  }, [fetchFileTree, refreshTrigger]);

  // Fetch file content when a file is selected
  useEffect(() => {
    if (!conversationId || !selectedFilePath) {
      setSelectedFileContent("");
      return;
    }

    const fetchContent = async () => {
      setIsLoadingContent(true);
      setContentError(null);

      try {
        const encodedPath = selectedFilePath
          .split("/")
          .map(encodeURIComponent)
          .join("/");
        const response = await fetch(
          `/api/conversations/${conversationId}/files${encodedPath}`
        );

        if (!response.ok) {
          throw new Error(`Failed to load file: ${response.status}`);
        }

        const data = await response.json();
        setSelectedFileContent(data.content || "");
      } catch (err) {
        setContentError(err instanceof Error ? err.message : "Failed to load file");
      } finally {
        setIsLoadingContent(false);
      }
    };

    fetchContent();
  }, [conversationId, selectedFilePath]);

  const handleFileSelect = (file: FileInfo) => {
    setSelectedFilePath(file.path);
    setActiveTab("files");
  };

  const handleFileDownload = async (file: FileInfo) => {
    if (!conversationId) return;

    try {
      const encodedPath = file.path
        .split("/")
        .map(encodeURIComponent)
        .join("/");
      const response = await fetch(
        `/api/conversations/${conversationId}/files${encodedPath}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch file");
      }

      const data = await response.json();
      if (!data.content) {
        throw new Error("Failed to get file content");
      }

      const blob = new Blob([data.content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download file:", err);
    }
  };

  // Header with tabs
  const renderHeader = () => (
    <div className="border-b border-border">
      <div className="flex items-center justify-between px-3 py-2 h-[52px]">
        <div className="flex items-center gap-1.5">
          <Scale className="size-3.5 text-[var(--debate-gold)]" />
          <span className="font-mono text-sm font-medium">증거 자료실</span>
        </div>
        <div className="flex items-center gap-0.5">
          {activeTab === "files" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => setIsExplorerCollapsed((prev) => !prev)}
                >
                  {isExplorerCollapsed ? (
                    <PanelLeft className="size-4" />
                  ) : (
                    <PanelLeftClose className="size-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {isExplorerCollapsed ? "Open" : "Close"} File Explorer
              </TooltipContent>
            </Tooltip>
          )}
          {onClose && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={onClose}
                >
                  <X className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Close Workspace</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
      {/* Tabs */}
      <div className="flex px-3 gap-1">
        <button
          onClick={() => setActiveTab("evidence")}
          className={cn(
            "px-3 py-1.5 text-xs font-mono rounded-t-md transition-colors border-b-2",
            activeTab === "evidence"
              ? "border-[var(--debate-gold)] text-[var(--debate-gold)]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          증거 ({evidence.length})
        </button>
        <button
          onClick={() => setActiveTab("files")}
          className={cn(
            "px-3 py-1.5 text-xs font-mono rounded-t-md transition-colors border-b-2 flex items-center gap-1",
            activeTab === "files"
              ? "border-[var(--debate-gold)] text-[var(--debate-gold)]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <FolderOpen className="size-3" />
          파일 {visibleFiles.length > 0 && `(${visibleFiles.length})`}
        </button>
      </div>
    </div>
  );

  // No conversation yet
  if (!conversationId) {
    return (
      <div className="flex h-full flex-col border-l border-border">
        {renderHeader()}
        <div className="flex h-full flex-col items-center justify-center text-muted-foreground text-sm p-4 text-center gap-2">
          <FileText className="size-8 text-muted-foreground/30" />
          <span>토론을 시작하면 증거 자료가 여기에 표시됩니다</span>
          <span className="text-[10px] text-muted-foreground/40">벤치마크, 코드 실행 결과, 참고 문헌</span>
        </div>
      </div>
    );
  }

  // Evidence tab
  if (activeTab === "evidence") {
    return (
      <div className="flex h-full flex-col border-l border-border">
        {renderHeader()}
        <div className="flex-1 overflow-auto">
          {evidence.length > 0 ? (
            <EvidenceCards evidence={evidence} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground text-sm p-4 text-center gap-2">
              <Scale className="size-8 text-muted-foreground/20" />
              <span>아직 수집된 증거가 없습니다</span>
              <span className="text-[10px] text-muted-foreground/40">
                에이전트가 웹 검색, 코드 실행 등을 하면 자동으로 표시됩니다
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Files tab - Loading state
  if (isTreeLoading && files.length === 0) {
    return (
      <div className="flex h-full flex-col border-l border-border">
        {renderHeader()}
        <div className="flex h-full items-center justify-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="size-4 animate-spin" />
          Initializing Workspace...
        </div>
      </div>
    );
  }

  // Files tab - Error state
  if (treeError && activeTab === "files") {
    return (
      <div className="flex h-full flex-col border-l border-border">
        {renderHeader()}
        <div className="flex h-full flex-col items-center justify-center gap-4 p-4 text-center">
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle className="text-destructive size-4" />
            Failed to Load Workspace
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => fetchFileTree()}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Files tab - Ready state
  return (
    <div className="flex h-full flex-col border-l border-border">
      {renderHeader()}
      <div className="flex w-full flex-1 overflow-hidden">
        <FileExplorer
          files={visibleFiles}
          onFileSelect={handleFileSelect}
          onFileDownload={handleFileDownload}
          selectedFilePath={selectedFilePath}
          isCollapsed={isExplorerCollapsed}
          onToggleCollapse={() => setIsExplorerCollapsed(!isExplorerCollapsed)}
          isLoading={isTreeLoading}
        />
        <div className="flex-1 overflow-hidden">
          <FileViewer
            selectedFilePath={selectedFilePath}
            selectedFileContent={selectedFileContent}
            isLoadingContent={isLoadingContent}
            contentError={contentError}
          />
        </div>
      </div>
    </div>
  );
}

export const WorkspacePanel = memo(WorkspacePanelComponent);
