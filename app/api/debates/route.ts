import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/debates
 * List all debates for the gallery (public, no auth required)
 */
export async function GET() {
  try {
    const debates = await prisma.conversation.findMany({
      where: {
        debateTopic: { not: null },
      },
      select: {
        id: true,
        status: true,
        debateTopic: true,
        userSide: true,
        agentSide: true,
        turnCount: true,
        maxTurns: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { votes: true },
        },
        votes: {
          select: { side: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });

    const items = debates.map((d) => {
      const userVotes = d.votes.filter((v) => v.side === "user").length;
      const agentVotes = d.votes.filter((v) => v.side === "agent").length;
      return {
        id: d.id,
        status: d.status,
        debateTopic: d.debateTopic,
        userSide: d.userSide,
        agentSide: d.agentSide,
        turnCount: d.turnCount,
        maxTurns: d.maxTurns,
        totalVotes: d._count.votes,
        votes: { user: userVotes, agent: agentVotes },
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({ debates: items });
  } catch (error) {
    console.error("Error in GET /api/debates:", error);
    return NextResponse.json(
      { error: "Failed to fetch debates" },
      { status: 500 }
    );
  }
}
