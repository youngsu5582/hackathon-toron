import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * POST /api/conversations/[id]/verdict
 * Submit user verdict for AI vs AI debates
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { verdict } = body;

    if (!verdict?.trim()) {
      return NextResponse.json(
        { error: "Verdict content is required" },
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

    if (conversation.debateMode !== "ai-vs-ai") {
      return NextResponse.json(
        { error: "Verdict is only available for AI vs AI debates" },
        { status: 400 }
      );
    }

    await prisma.conversation.update({
      where: { id },
      data: {
        userVerdict: verdict.trim(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in POST /api/conversations/[id]/verdict:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
