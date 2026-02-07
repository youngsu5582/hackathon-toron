export interface DebateTopic {
  id: string;
  title: string;
  description: string;
  sideA: { label: string; emoji: string };
  sideB: { label: string; emoji: string };
}

export const DEBATE_TOPICS: DebateTopic[] = [
  {
    id: "normalization",
    title: "정규화 vs 역정규화",
    description:
      "데이터베이스 설계의 영원한 논쟁. 정규화로 무결성을 지킬 것인가, 역정규화로 성능을 택할 것인가?",
    sideA: { label: "정규화 찬성", emoji: "🏛️" },
    sideB: { label: "역정규화 찬성", emoji: "⚡" },
  },
  {
    id: "monolith-micro",
    title: "모놀리스 vs 마이크로서비스",
    description:
      "하나의 거대한 성을 쌓을 것인가, 수많은 작은 요새로 나눌 것인가?",
    sideA: { label: "모놀리스 찬성", emoji: "🏰" },
    sideB: { label: "마이크로서비스 찬성", emoji: "🧩" },
  },
  {
    id: "rest-graphql",
    title: "REST vs GraphQL",
    description:
      "검증된 REST의 단순함인가, GraphQL의 유연한 데이터 페칭인가?",
    sideA: { label: "REST 찬성", emoji: "📡" },
    sideB: { label: "GraphQL 찬성", emoji: "🔮" },
  },
  {
    id: "sql-nosql",
    title: "SQL vs NoSQL",
    description: "관계형 DB의 견고함인가, NoSQL의 확장성인가?",
    sideA: { label: "SQL 찬성", emoji: "📊" },
    sideB: { label: "NoSQL 찬성", emoji: "🌊" },
  },
  {
    id: "bumuk-jjikmuk",
    title: "부먹 vs 찍먹",
    description:
      "탕수육의 진정한 먹는 법은? 기술적 관점에서 분석해보자!",
    sideA: { label: "부먹 찬성", emoji: "🫗" },
    sideB: { label: "찍먹 찬성", emoji: "🥢" },
  },
];
