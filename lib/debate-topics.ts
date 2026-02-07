export interface DebateTopic {
  id: string;
  title: string;
  description: string;
  sideA: { label: string; emoji: string };
  sideB: { label: string; emoji: string };
  briefing?: string; // Moderator opening briefing
}

export const DEBATE_TOPICS: DebateTopic[] = [
  {
    id: "normalization",
    title: "정규화 vs 역정규화",
    description:
      "데이터베이스 설계의 영원한 논쟁. 정규화로 무결성을 지킬 것인가, 역정규화로 성능을 택할 것인가?",
    sideA: { label: "정규화 찬성", emoji: "🏛️" },
    sideB: { label: "역정규화 찬성", emoji: "⚡" },
    briefing:
      "데이터베이스 설계의 근본적 딜레마입니다. E.F. Codd가 1970년 제안한 정규화는 데이터 무결성의 수호자이지만, 현대의 대규모 읽기 워크로드에서는 JOIN 비용이 병목이 됩니다. Instagram은 비정규화로 초당 수만 쿼리를 처리하고, 은행 시스템은 3NF를 철벽 수호합니다. 과연 정답이 있을까요?",
  },
  {
    id: "monolith-micro",
    title: "모놀리스 vs 마이크로서비스",
    description:
      "하나의 거대한 성을 쌓을 것인가, 수많은 작은 요새로 나눌 것인가?",
    sideA: { label: "모놀리스 찬성", emoji: "🏰" },
    sideB: { label: "마이크로서비스 찬성", emoji: "🧩" },
    briefing:
      "2010년대 Netflix가 마이크로서비스로 전환한 이후 업계의 트렌드가 되었지만, 최근 Amazon Prime Video가 다시 모놀리스로 돌아가 90% 비용 절감을 달성했습니다. Shopify는 모놀리스로 블랙프라이데이 트래픽을 처리하고, Uber는 수천 개의 마이크로서비스를 운영합니다. 스케일과 복잡성의 트레이드오프, 어느 쪽이 옳을까요?",
  },
  {
    id: "rest-graphql",
    title: "REST vs GraphQL",
    description:
      "검증된 REST의 단순함인가, GraphQL의 유연한 데이터 페칭인가?",
    sideA: { label: "REST 찬성", emoji: "📡" },
    sideB: { label: "GraphQL 찬성", emoji: "🔮" },
    briefing:
      "2000년 Roy Fielding이 정의한 REST는 웹의 근간이 되었고, 2015년 Facebook이 공개한 GraphQL은 프론트엔드 개발의 혁명을 약속했습니다. GitHub은 REST API v3에서 GraphQL v4로 전환했지만, Google과 AWS는 여전히 REST 중심입니다. 캐싱, 타입 안정성, 개발자 경험... 승자는?",
  },
  {
    id: "sql-nosql",
    title: "SQL vs NoSQL",
    description: "관계형 DB의 견고함인가, NoSQL의 확장성인가?",
    sideA: { label: "SQL 찬성", emoji: "📊" },
    sideB: { label: "NoSQL 찬성", emoji: "🌊" },
    briefing:
      "1970년부터 40년간 RDBMS가 지배한 데이터베이스 시장에 MongoDB, Cassandra, DynamoDB가 도전장을 내밀었습니다. Discord는 Cassandra에서 ScyllaDB로, Uber는 PostgreSQL에서 MySQL로 이동했고, 최근 NewSQL(CockroachDB, TiDB)이 양쪽의 장점을 결합하려 합니다. ACID vs BASE, 어떤 보장이 더 중요할까요?",
  },
  {
    id: "bumuk-jjikmuk",
    title: "부먹 vs 찍먹",
    description:
      "탕수육의 진정한 먹는 법은? 기술적 관점에서 분석해보자!",
    sideA: { label: "부먹 찬성", emoji: "🫗" },
    sideB: { label: "찍먹 찬성", emoji: "🥢" },
    briefing:
      "한국 IT 업계의 진정한 holy war. 부먹은 통합 테스트처럼 전체가 하나의 맛으로 통일되고, 찍먹은 단위 테스트처럼 각 컴포넌트의 독립성을 보장합니다. 배달의민족 내부 설문에서는 찍먹 62% vs 부먹 38%. 하지만 부먹파는 시간이 지나면 소스가 스며드는 '최적화'를 주장합니다. 이 논쟁, 기술로 해결될 수 있을까요?",
  },
];
