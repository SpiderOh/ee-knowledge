import { PrismaClient, KnowledgeCategory, RelationType, ReviewStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const areas = [
    { name: "电路与电子技术", slug: "electronics", description: "电路、模拟与数字电子技术" },
    { name: "信号与系统", slug: "signals", description: "信号处理与通信基础" },
    { name: "嵌入式与计算机", slug: "embedded", description: "C 语言、嵌入式与计算机基础" },
  ];
  for (const area of areas) await prisma.subjectArea.upsert({ where: { slug: area.slug }, update: area, create: area });

  const courses = [
    { name: "电路原理", slug: "circuit-theory", area: "electronics", description: "集总参数电路的基本理论与分析方法" },
    { name: "模拟电子技术", slug: "analog-electronics", area: "electronics", description: "半导体器件与模拟电路" },
    { name: "数字电子技术", slug: "digital-electronics", area: "electronics", description: "数字逻辑、时序电路与数字系统" },
    { name: "信号与系统", slug: "signals-and-systems", area: "signals", description: "连续与离散信号系统分析" },
    { name: "数字信号处理", slug: "digital-signal-processing", area: "signals", description: "采样、变换与数字滤波" },
    { name: "嵌入式系统", slug: "embedded-systems", area: "embedded", description: "单片机、接口与嵌入式软件" },
  ];
  for (let index = 0; index < courses.length; index++) {
    const item = courses[index];
    const area = await prisma.subjectArea.findUniqueOrThrow({ where: { slug: item.area } });
    await prisma.course.upsert({ where: { slug: item.slug }, update: { name: item.name, description: item.description, subjectAreaId: area.id, sortOrder: index }, create: { name: item.name, slug: item.slug, description: item.description, subjectAreaId: area.id, sortOrder: index } });
  }

  const circuit = await prisma.course.findUniqueOrThrow({ where: { slug: "circuit-theory" } });
  const points = [
    ["电路模型", "circuit-model", "用理想元件和连接关系抽象实际电路。", "电路模型是对实际电路中器件和连接关系的理想化描述。", KnowledgeCategory.CIRCUIT],
    ["电流", "electric-current", "电荷有规则的定向运动。", "电流是单位时间内通过导体横截面的电荷量。", KnowledgeCategory.CONCEPT],
    ["电压", "electric-voltage", "推动电荷移动的能量差。", "电压是单位正电荷从一点移动到另一点时电场力所做的功。", KnowledgeCategory.CONCEPT],
    ["电功率", "electric-power", "电路元件能量转换的速率。", "电功率表示单位时间内电路元件吸收或发出的电能。", KnowledgeCategory.FORMULA],
    ["基尔霍夫电流定律", "kirchhoff-current-law", "任一节点的电流代数和为零。", "在集总参数电路中，任一节点上各支路电流的代数和等于零。", KnowledgeCategory.THEOREM],
    ["基尔霍夫电压定律", "kirchhoff-voltage-law", "任一回路的电压代数和为零。", "沿任一闭合回路，各段电压的代数和等于零。", KnowledgeCategory.THEOREM],
    ["电阻电路等效变换", "resistor-equivalent", "用等效网络简化电阻电路。", "端口特性相同的电路可以相互替换而不改变外部电路的工作状态。", KnowledgeCategory.METHOD],
    ["叠加定理", "superposition-theorem", "线性电路响应等于各独立源单独作用响应之和。", "在线性电路中，任一支路的电压或电流响应等于各独立电源单独作用时响应的代数和。", KnowledgeCategory.THEOREM],
    ["戴维南定理", "thevenin-theorem", "线性有源二端网络可等效为电压源串联电阻。", "任一线性有源二端网络对外部电路的作用，可以用一个电压源和电阻串联的等效电路表示。", KnowledgeCategory.THEOREM],
    ["诺顿定理", "norton-theorem", "线性有源二端网络可等效为电流源并联电阻。", "任一线性有源二端网络可等效为一个电流源和电阻并联的电路。", KnowledgeCategory.THEOREM],
  ] as const;
  for (const [title, slug, summary, definition, category] of points) await prisma.knowledgePoint.upsert({ where: { slug }, update: { title, summary, definition, category, courseId: circuit.id, reviewStatus: ReviewStatus.VERIFIED }, create: { title, slug, summary, definition, category, courseId: circuit.id, reviewStatus: ReviewStatus.VERIFIED } });

  const [currentLaw, voltageLaw, current] = await Promise.all([
    prisma.knowledgePoint.findUniqueOrThrow({ where: { slug: "kirchhoff-current-law" } }),
    prisma.knowledgePoint.findUniqueOrThrow({ where: { slug: "kirchhoff-voltage-law" } }),
    prisma.knowledgePoint.findUniqueOrThrow({ where: { slug: "electric-current" } }),
  ]);
  await prisma.formula.upsert({ where: { id: "demo-formula-kcl-1" }, update: { knowledgePointId: currentLaw.id, name: "节点电流定律", latex: "\\sum_{k=1}^{n} i_k = 0", description: "节点处各支路电流的代数和为零。", conditions: "集总参数电路节点分析。", sortOrder: 0 }, create: { id: "demo-formula-kcl-1", knowledgePointId: currentLaw.id, name: "节点电流定律", latex: "\\sum_{k=1}^{n} i_k = 0", description: "节点处各支路电流的代数和为零。", conditions: "集总参数电路节点分析。", sortOrder: 0 } });
  await prisma.formula.upsert({ where: { id: "demo-formula-kvl-1" }, update: { knowledgePointId: voltageLaw.id, name: "回路电压定律", latex: "\\sum_{k=1}^{n} u_k = 0", description: "沿闭合回路电压的代数和为零。", conditions: "集总参数电路闭合回路分析。", sortOrder: 0 }, create: { id: "demo-formula-kvl-1", knowledgePointId: voltageLaw.id, name: "回路电压定律", latex: "\\sum_{k=1}^{n} u_k = 0", description: "沿闭合回路电压的代数和为零。", conditions: "集总参数电路闭合回路分析。", sortOrder: 0 } });
  await prisma.example.upsert({ where: { id: "demo-example-kcl-1" }, update: { knowledgePointId: currentLaw.id, title: "节点电流计算", content: "某节点有 $2A$ 和 $3A$ 电流流入，另有 $1A$ 电流流出，求另一支路流出电流。", solution: "根据 KCL：\n\n$$\n2+3=1+I\n$$\n\n因此：\n\n$$\nI=4A\n$$", type: "计算题", sortOrder: 0 }, create: { id: "demo-example-kcl-1", knowledgePointId: currentLaw.id, title: "节点电流计算", content: "某节点有 $2A$ 和 $3A$ 电流流入，另有 $1A$ 电流流出，求另一支路流出电流。", solution: "根据 KCL：\n\n$$\n2+3=1+I\n$$\n\n因此：\n\n$$\nI=4A\n$$", type: "计算题", sortOrder: 0 } });
  const relations = [
    { id: "demo-relation-current-kcl", sourceKnowledgePointId: current.id, targetKnowledgePointId: currentLaw.id, relationType: RelationType.PREREQUISITE, description: "先理解电流方向和符号，才能进行节点电流分析。" },
    { id: "demo-relation-kcl-kvl", sourceKnowledgePointId: currentLaw.id, targetKnowledgePointId: voltageLaw.id, relationType: RelationType.RELATED, description: "KCL 与 KVL 共同构成基尔霍夫定律。" },
    { id: "demo-relation-kvl-kcl", sourceKnowledgePointId: voltageLaw.id, targetKnowledgePointId: currentLaw.id, relationType: RelationType.RELATED, description: "KVL 与 KCL 都是电路拓扑分析的基础定律。" },
  ];
  for (const relation of relations) await prisma.knowledgeRelation.upsert({ where: { sourceKnowledgePointId_targetKnowledgePointId_relationType: { sourceKnowledgePointId: relation.sourceKnowledgePointId, targetKnowledgePointId: relation.targetKnowledgePointId, relationType: relation.relationType } }, update: { description: relation.description }, create: relation });

  const book = await prisma.book.upsert({ where: { id: "demo-circuit-book" }, update: { title: "电路（第五版）", author: "邱关源", publisher: "高等教育出版社", edition: "第五版" }, create: { id: "demo-circuit-book", courseId: circuit.id, title: "电路（第五版）", author: "邱关源", publisher: "高等教育出版社", edition: "第五版" } });
  // 仅同步 Demo 教材的章节关联，避免历史 fixture 残留影响正式或其他教材数据。
  await prisma.chapterKnowledgePoint.deleteMany({ where: { chapter: { bookId: book.id } } });
  const chapterData = [
    { id: "demo-circuit-chapter-1", title: "电路模型和电路定律", number: "1", level: 1, parentId: null, sortOrder: 0, points: ["circuit-model"] },
    { id: "demo-circuit-chapter-1-1", title: "基本物理量", number: "1.1", level: 2, parentId: "demo-circuit-chapter-1", sortOrder: 0, points: ["electric-current", "electric-voltage", "electric-power"] },
    { id: "demo-circuit-chapter-1-2", title: "基尔霍夫定律", number: "1.2", level: 2, parentId: "demo-circuit-chapter-1", sortOrder: 1, points: ["kirchhoff-current-law", "kirchhoff-voltage-law"] },
    { id: "demo-circuit-chapter-2", title: "电阻电路分析", number: "2", level: 1, parentId: null, sortOrder: 1, points: ["resistor-equivalent", "superposition-theorem", "thevenin-theorem", "norton-theorem"] },
  ];
  for (const chapter of chapterData) {
    const record = await prisma.chapter.upsert({ where: { id: chapter.id }, update: { bookId: book.id, title: chapter.title, number: chapter.number, level: chapter.level, parentId: chapter.parentId, sortOrder: chapter.sortOrder }, create: { id: chapter.id, bookId: book.id, title: chapter.title, number: chapter.number, level: chapter.level, parentId: chapter.parentId, sortOrder: chapter.sortOrder } });
    for (let index = 0; index < chapter.points.length; index++) {
      const knowledgePoint = await prisma.knowledgePoint.findUniqueOrThrow({ where: { slug: chapter.points[index] } });
      await prisma.chapterKnowledgePoint.upsert({ where: { chapterId_knowledgePointId: { chapterId: record.id, knowledgePointId: knowledgePoint.id } }, update: { sortOrder: index }, create: { chapterId: record.id, knowledgePointId: knowledgePoint.id, sortOrder: index } });
    }
  }
  console.log("Seed complete: 6 courses, 1 book, 4 chapters, 10 knowledge points");
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());
