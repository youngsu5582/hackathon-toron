import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { killSandbox } from "@/lib/moru";

/**
 * GET /api/admin/debates
 * List all conversations with full details for admin
 */
export async function GET() {
  try {
    const debates = await prisma.conversation.findMany({
      select: {
        id: true,
        status: true,
        debateTopic: true,
        userSide: true,
        agentSide: true,
        turnCount: true,
        maxTurns: true,
        debateMode: true,
        volumeId: true,
        sandboxId: true,
        sessionId: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { votes: true, comments: true, turns: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const items = debates.map((d) => ({
      id: d.id,
      status: d.status,
      debateTopic: d.debateTopic || "(주제 없음)",
      userSide: d.userSide || "-",
      agentSide: d.agentSide || "-",
      turnCount: d.turnCount,
      maxTurns: d.maxTurns,
      debateMode: d.debateMode,
      volumeId: d.volumeId,
      sandboxId: d.sandboxId,
      sessionId: d.sessionId,
      errorMessage: d.errorMessage,
      voteCount: d._count.votes,
      commentCount: d._count.comments,
      turnDataCount: d._count.turns,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    }));

    return NextResponse.json({ debates: items });
  } catch (error) {
    console.error("Error in GET /api/admin/debates:", error);
    return NextResponse.json(
      { error: "Failed to fetch debates" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/debates
 * Bulk delete conversations by IDs
 * Body: { ids: string[] }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const ids: string[] = body.ids;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "ids array required" },
        { status: 400 }
      );
    }

    // Fetch sandbox IDs to kill running sandboxes
    const conversations = await prisma.conversation.findMany({
      where: { id: { in: ids } },
      select: { id: true, sandboxId: true, status: true },
    });

    // Kill any running sandboxes
    for (const conv of conversations) {
      if (conv.sandboxId && conv.status === "running") {
        try {
          await killSandbox(conv.sandboxId);
        } catch {
          // Best effort
        }
      }
    }

    // Delete related records first (no cascade in schema)
    await prisma.debateTurn.deleteMany({ where: { conversationId: { in: ids } } });
    await prisma.comment.deleteMany({ where: { conversationId: { in: ids } } });
    await prisma.vote.deleteMany({ where: { conversationId: { in: ids } } });

    // Delete conversations
    const result = await prisma.conversation.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json({
      deleted: result.count,
      message: `${result.count}개 토론 삭제됨`,
    });
  } catch (error) {
    console.error("Error in DELETE /api/admin/debates:", error);
    return NextResponse.json(
      { error: "Failed to delete debates" },
      { status: 500 }
    );
  }
}
