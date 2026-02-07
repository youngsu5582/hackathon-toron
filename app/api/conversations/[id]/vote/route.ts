import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * POST /api/conversations/[id]/vote
 * Cast a vote for a side in the debate
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { side } = body as { side: string };

    if (side !== "user" && side !== "agent") {
      return NextResponse.json(
        { error: "Side must be 'user' or 'agent'" },
        { status: 400 }
      );
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    await prisma.vote.create({
      data: {
        conversationId: id,
        side,
      },
    });

    // Return updated counts
    const [userVotes, agentVotes] = await Promise.all([
      prisma.vote.count({ where: { conversationId: id, side: "user" } }),
      prisma.vote.count({ where: { conversationId: id, side: "agent" } }),
    ]);

    return NextResponse.json({ user: userVotes, agent: agentVotes });
  } catch (error) {
    console.error("Error in POST /api/conversations/[id]/vote:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
