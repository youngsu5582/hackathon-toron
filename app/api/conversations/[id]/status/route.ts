import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  killSandbox,
  createAndLaunchAgent,
  createVolume,
  readVolumeFile,
} from "@/lib/moru";
import { parseSessionJSONL, getSessionFilePath } from "@/lib/session-parser";
import type { StatusCallbackRequest } from "@/lib/types";

/**
 * Extract the last assistant text response from a session file.
 */
function extractLastAssistantText(
  entries: ReturnType<typeof parseSessionJSONL>
): string {
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (entry.type === "assistant") {
      const content = (entry as any).message?.content;
      if (Array.isArray(content)) {
        const textBlocks = content
          .filter((b: any) => b.type === "text" && b.text)
          .map((b: any) => b.text);
        if (textBlocks.length > 0) return textBlocks.join("\n");
      }
    }
  }
  return "";
}

/**
 * POST /api/conversations/[id]/status
 * Callback endpoint for sandbox to report completion
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: StatusCallbackRequest = await request.json();
    const { status, errorMessage, sessionId } = body;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // AI vs AI auto-chaining: decide BEFORE updating status so we never
    // expose a transient "completed" that the frontend can observe.
    const isAiVsAi = conversation.debateMode === "ai-vs-ai";
    const shouldChain =
      isAiVsAi &&
      status === "completed" &&
      conversation.turnCount < conversation.maxTurns &&
      conversation.volumeId &&
      sessionId;

    if (shouldChain) {
      try {
        // Extract last assistant response from the completed agent's session
        const sessionPath = getSessionFilePath(sessionId!);
        // Wait a bit for volume sync before reading
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const sessionContent = await readVolumeFile(
          conversation.volumeId!,
          sessionPath
        );
        const entries = parseSessionJSONL(sessionContent);
        const lastResponse = extractLastAssistantText(entries);

        if (lastResponse) {
          const currentSide = conversation.currentSide || "sideA";
          const sideLabel =
            currentSide === "sideA"
              ? conversation.userSide || "Side A"
              : conversation.agentSide || "Side B";
          const persona = currentSide === "sideA" ? "알파" : "오메가";
          const nextSide = currentSide === "sideA" ? "sideB" : "sideA";
          const nextAgentRole =
            nextSide === "sideA" ? "agent-a" : "agent-b";
          const nextAgentSide =
            nextSide === "sideA"
              ? conversation.userSide!
              : conversation.agentSide!;
          const nextOpponentSide =
            nextSide === "sideA"
              ? conversation.agentSide!
              : conversation.userSide!;

          // Batch all DB writes in a single transaction to reduce connection usage
          const [, recentComments, updatedConversation] =
            await prisma.$transaction([
              prisma.debateTurn.create({
                data: {
                  conversationId: id,
                  turnNumber: conversation.turnCount,
                  side: currentSide,
                  sideLabel,
                  persona,
                  content: lastResponse,
                },
              }),
              prisma.comment.findMany({
                where: { conversationId: id },
                orderBy: { createdAt: "desc" },
                take: 5,
              }),
              prisma.conversation.update({
                where: { id },
                data: {
                  turnCount: { increment: 1 },
                  currentSide: nextSide,
                  status: "running",
                  sessionId: sessionId || conversation.sessionId,
                  sandboxId: null,
                },
              }),
            ]);

          // Kill the completed sandbox before launching the next one
          if (conversation.sandboxId) {
            await killSandbox(conversation.sandboxId);
          }

          let nextContent = lastResponse;
          if (recentComments.length > 0) {
            const commentLines = recentComments
              .reverse()
              .map((c) => `- ${c.nickname}: "${c.content}"`)
              .join("\n");
            nextContent = `${lastResponse}\n\n[중재자 & 관중 코멘트]\n${commentLines}`;
          }

          // Launch next agent (no session resume — fresh session each turn)
          const { sandboxId: nextSandboxId } = await createAndLaunchAgent(
            conversation.volumeId!,
            id,
            nextContent,
            undefined, // No session resume for AI vs AI
            {
              debateTopic: conversation.debateTopic || undefined,
              userSide: nextOpponentSide,
              agentSide: nextAgentSide,
              turnCount: updatedConversation.turnCount,
              isVerdictRequest: false,
              agentRole: nextAgentRole,
              aiVsAiMode: true,
            }
          );

          await prisma.conversation.update({
            where: { id },
            data: { sandboxId: nextSandboxId },
          });

          return NextResponse.json({
            success: true,
            aiVsAiChained: true,
            nextSide,
          });
        }
      } catch (chainError) {
        console.error(
          "AI vs AI chaining error (non-fatal):",
          chainError
        );
        // Fall through to normal completion
      }
    }

    // Normal status update (non-chaining path, or chaining failed)
    await prisma.conversation.update({
      where: { id },
      data: {
        status,
        errorMessage: errorMessage || null,
        sessionId: sessionId || conversation.sessionId,
        sandboxId: null, // Sandbox is done
      },
    });

    // Normal flow: wait for volume sync then kill sandbox
    if (conversation.sandboxId) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await killSandbox(conversation.sandboxId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in POST /api/conversations/[id]/status:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
