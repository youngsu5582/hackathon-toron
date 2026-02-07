import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readVolumeFile } from "@/lib/moru";
import { parseSessionJSONL, getSessionFilePath } from "@/lib/session-parser";
import { extractEvidence } from "@/lib/evidence-parser";
import type { ConversationResponse } from "@/lib/types";

/**
 * GET /api/conversations/[id]
 * Get conversation state and messages
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        _count: {
          select: { votes: true },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Count votes by side
    const [userVotes, agentVotes] = await Promise.all([
      prisma.vote.count({
        where: { conversationId: id, side: "user" },
      }),
      prisma.vote.count({
        where: { conversationId: id, side: "agent" },
      }),
    ]);

    // Fetch comments
    const comments = await prisma.comment.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        nickname: true,
        content: true,
        side: true,
        isTagIn: true,
        createdAt: true,
      },
    });

    const response: ConversationResponse = {
      id: conversation.id,
      status: conversation.status as ConversationResponse["status"],
      messages: [],
      errorMessage: conversation.errorMessage || undefined,
      debateTopic: conversation.debateTopic || undefined,
      userSide: conversation.userSide || undefined,
      agentSide: conversation.agentSide || undefined,
      turnCount: conversation.turnCount,
      maxTurns: conversation.maxTurns,
      votes: { user: userVotes, agent: agentVotes },
      comments: comments.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
      })),
      debateMode: conversation.debateMode as ConversationResponse["debateMode"],
      currentSide: conversation.currentSide || undefined,
      userVerdict: conversation.userVerdict || undefined,
    };

    // For AI vs AI mode, fetch debate turns
    if (conversation.debateMode === "ai-vs-ai") {
      const turns = await prisma.debateTurn.findMany({
        where: { conversationId: id },
        orderBy: { turnNumber: "asc" },
      });
      response.turns = turns.map((t) => ({
        id: t.id,
        turnNumber: t.turnNumber,
        side: t.side,
        sideLabel: t.sideLabel,
        persona: t.persona,
        content: t.content,
        createdAt: t.createdAt.toISOString(),
      }));
    }

    // If we have a sessionId and volumeId, try to read the session file
    if (conversation.sessionId && conversation.volumeId) {
      try {
        const sessionPath = getSessionFilePath(conversation.sessionId);
        const content = await readVolumeFile(conversation.volumeId, sessionPath);
        response.messages = parseSessionJSONL(content);
        response.evidence = extractEvidence(response.messages);
      } catch (error) {
        // Session file doesn't exist yet or can't be read - return empty
        // The client will show pending messages until real messages arrive
        console.log("Could not read session file (may not exist yet):", error);
        response.messages = [];
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in GET /api/conversations/[id]:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
