import type { Metadata } from "next";
import { prisma } from "@/lib/db";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      select: {
        debateTopic: true,
        userSide: true,
        agentSide: true,
        turnCount: true,
        status: true,
      },
    });

    if (!conversation || !conversation.debateTopic) {
      return {
        title: "Toron - AI 토론 아레나",
        description: "AI와 치열한 토론을 벌여보세요!",
      };
    }

    const statusLabel =
      conversation.status === "running"
        ? "진행 중"
        : conversation.status === "completed"
          ? "완료"
          : conversation.status;

    const title = `${conversation.debateTopic} — Toron`;
    const description = `${conversation.userSide} vs ${conversation.agentSide} | 라운드 ${conversation.turnCount} | ${statusLabel}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "website",
        siteName: "Toron - AI 토론 아레나",
      },
      twitter: {
        card: "summary",
        title,
        description,
      },
    };
  } catch {
    return {
      title: "Toron - AI 토론 아레나",
      description: "AI와 치열한 토론을 벌여보세요!",
    };
  }
}

export default function DebateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
