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
        title: "기술 맞짱: 아키텍처 법정",
        description: "AI와 기술 토론을 벌여보세요!",
      };
    }

    const statusLabel =
      conversation.status === "running"
        ? "진행 중"
        : conversation.status === "completed"
          ? "완료"
          : conversation.status;

    const title = `${conversation.debateTopic} — 기술 맞짱`;
    const description = `${conversation.userSide} vs ${conversation.agentSide} | 라운드 ${conversation.turnCount} | ${statusLabel}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "website",
        siteName: "기술 맞짱: 아키텍처 법정",
      },
      twitter: {
        card: "summary",
        title,
        description,
      },
    };
  } catch {
    return {
      title: "기술 맞짱: 아키텍처 법정",
      description: "AI와 기술 토론을 벌여보세요!",
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
