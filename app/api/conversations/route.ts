import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  createVolume,
  createAndLaunchAgent,
} from "@/lib/moru";
import type { SendMessageRequest, SendMessageResponse } from "@/lib/types";

/**
 * POST /api/conversations
 * Send a message - creates conversation if needed
 */
export async function POST(request: NextRequest) {
  try {
    const body: SendMessageRequest = await request.json();
    const { conversationId, content, debateMetadata, isVerdictRequest } = body;

    if (!content?.trim()) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    let conversation;
    let volumeId: string;
    let sessionId: string | undefined;

    if (conversationId) {
      // Follow-up message to existing conversation
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });

      if (!conversation) {
        return NextResponse.json(
          { error: "Conversation not found" },
          { status: 404 }
        );
      }

      if (conversation.status === "running") {
        return NextResponse.json(
          { error: "Conversation is already running" },
          { status: 409 }
        );
      }

      volumeId = conversation.volumeId!;
      sessionId = conversation.sessionId || undefined;
    } else {
      // New conversation - create record first (with debate metadata if provided)
      conversation = await prisma.conversation.create({
        data: {
          status: "idle",
          debateTopic: debateMetadata?.topic,
          userSide: debateMetadata?.userSide,
          agentSide: debateMetadata?.agentSide,
        },
      });

      // Create volume for this conversation
      volumeId = await createVolume(conversation.id);

      // Update conversation with volumeId
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { volumeId },
      });
    }

    // Increment turn count
    conversation = await prisma.conversation.update({
      where: { id: conversation.id },
      data: { turnCount: { increment: 1 } },
    });

    // Gather audience comments since last turn to include in prompt
    let enrichedContent = content;
    if (conversationId) {
      const recentComments = await prisma.comment.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      if (recentComments.length > 0) {
        const commentLines = recentComments
          .reverse()
          .map((c) => {
            const sideLabel = c.side === "user"
              ? `[${conversation!.userSide || "사용자"} 응원]`
              : c.side === "agent"
                ? `[${conversation!.agentSide || "AI"} 응원]`
                : "[중립]";
            const tagLabel = c.isTagIn ? " (태그인 참전!)" : "";
            return `- ${c.nickname} ${sideLabel}${tagLabel}: "${c.content}"`;
          })
          .join("\n");

        enrichedContent = `${content}\n\n[관중석 반응 — 이 의견들을 토론에 반영하세요. 관중 응원은 판결에 영향을 줍니다!]\n${commentLines}`;
      }
    }

    // Create sandbox and launch agent (fire-and-forget, no streaming connection)
    const { sandboxId } = await createAndLaunchAgent(
      volumeId,
      conversation.id,
      enrichedContent,
      sessionId,
      {
        debateTopic: conversation.debateTopic || undefined,
        userSide: conversation.userSide || undefined,
        agentSide: conversation.agentSide || undefined,
        turnCount: conversation.turnCount,
        isVerdictRequest: isVerdictRequest || false,
      }
    );

    // Update conversation to running state
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        status: "running",
        sandboxId,
      },
    });

    const response: SendMessageResponse = {
      conversationId: conversation.id,
      status: "running",
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in POST /api/conversations:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
