import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { killSandbox } from "@/lib/moru";

/**
 * DELETE /api/admin/debates/[id]
 * Delete a single conversation and all related records
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      select: { id: true, sandboxId: true, status: true },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Kill sandbox if running
    if (conversation.sandboxId && conversation.status === "running") {
      try {
        await killSandbox(conversation.sandboxId);
      } catch {
        // Best effort
      }
    }

    // Delete related records first
    await prisma.debateTurn.deleteMany({ where: { conversationId: id } });
    await prisma.comment.deleteMany({ where: { conversationId: id } });
    await prisma.vote.deleteMany({ where: { conversationId: id } });

    // Delete conversation
    await prisma.conversation.delete({ where: { id } });

    return NextResponse.json({ deleted: true, id });
  } catch (error) {
    console.error("Error in DELETE /api/admin/debates/[id]:", error);
    return NextResponse.json(
      { error: "Failed to delete debate" },
      { status: 500 }
    );
  }
}
