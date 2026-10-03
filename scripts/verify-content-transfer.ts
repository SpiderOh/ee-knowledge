import { PrismaClient, RelationType, StudyStatus } from "@prisma/client";
import { MAX_BUNDLE_BYTES, exportKnowledgeBundle, importKnowledgeBundle, parseKnowledgeBundle, previewKnowledgeBundle } from "@/features/content-transfer/service";
import { exampleIdForImport, formulaIdForImport, questionIdForImport } from "@/features/content-transfer/ids";

const prisma = new PrismaClient();
const areaSlug = "verify-content-area";
const courseSlug = "verify-content-course";
const pointSlug = "verify-content-point";
const relatedSlug = "verify-content-related";
const existingAreaSlug = "verify-existing-area";
const existingCourseSlug = "verify-existing-course";
const newCourseSlug = "verify-new-course";
const emptyCourseSlug = "verify-empty-course";
const emptyAreaSlug = "verify-empty-area";
const hijackASlug = "verify-hijack-a";
const hijackBSlug = "verify-hijack-b";
const portablePointSlug = "verify-portable-point";
const deterministicOwnerSlug = "verify-deterministic-owner";
const deterministicTargetSlug = "verify-deterministic-target";
const sortSlugs = ["verify-sort-a", "verify-sort-b", "verify-sort-c"];

const bundle = (summary = "验证内容") => ({ kind: "ee-knowledge-content" as const, schemaVersion: "1.0" as const, subjectAreas: [{ slug: areaSlug, name: "验证方向", description: null, sortOrder: 99 }], courses: [{ slug: courseSlug, name: "验证课程", description: "Content transfer verification", sortOrder: 99, subjectAreaSlug: areaSlug }], knowledgePoints: [{ slug: pointSlug, courseSlug, title: "验证知识点", category: "CONCEPT" as const, summary, commonMistakes: "容易混淆的验证错误。", masteryCriteria: "能够完成验证。", definition: "## 定义\n\n验证 Markdown。", importance: 3, interviewImportance: 3, difficulty: 2, reviewStatus: "AI_DRAFT" as const, formulas: [{ key: "main", name: "验证公式", latex: "x + y = z", description: null, conditions: null, sortOrder: 0 }], examples: [{ key: "demo", title: "验证案例", type: "测试", content: "案例内容", solution: "案例解答", sortOrder: 0 }], questions: [{ key: "common", question: "如何验证内容？", level: 1, frequency: 2, source: "verify", shortAnswer: "简短回答", standardAnswer: "标准回答", deepAnswer: null }] }, { slug: relatedSlug, courseSlug, title: "验证关系目标", category: "CONCEPT" as const, summary: "关系目标", reviewStatus: "AI_DRAFT" as const }], relations: [{ sourceSlug: pointSlug, targetSlug: relatedSlug, relationType: RelationType.RELATED, description: "验证关系" }] });

function assert(condition: boolean, message: string): asserts condition { if (!condition) throw new Error(message); }

async function cleanup() {
  const pointSlugs = [pointSlug, relatedSlug, "verify-existing-point", hijackASlug, hijackBSlug, portablePointSlug, deterministicOwnerSlug, deterministicTargetSlug, "verify-partial-point", "verify-default-point", ...sortSlugs];
  await prisma.knowledgePoint.deleteMany({ where: { slug: { in: pointSlugs } } });
  await prisma.course.deleteMany({ where: { slug: { in: [courseSlug, existingCourseSlug, newCourseSlug, emptyCourseSlug, "verify-partial-course", "verify-default-course"] } } });
  await prisma.subjectArea.deleteMany({ where: { slug: { in: [areaSlug, existingAreaSlug, emptyAreaSlug, "verify-partial-area", "verify-default-area"] } } });
}

async function counts() { const [points, formulas, examples, questions, relations] = await Promise.all([prisma.knowledgePoint.count({ where: { slug: { in: [pointSlug, relatedSlug] } } }), prisma.formula.count({ where: { knowledgePoint: { slug: pointSlug } } }), prisma.example.count({ where: { knowledgePoint: { slug: pointSlug } } }), prisma.interviewQuestion.count({ where: { knowledgePoint: { slug: pointSlug } } }), prisma.knowledgeRelation.count({ where: { source: { slug: pointSlug }, target: { slug: relatedSlug } } })]); return { points, formulas, examples, questions, relations }; }

async function main() {
  assert(MAX_BUNDLE_BYTES === 2 * 1024 * 1024, "应用级 Bundle 限制不应改变");
  const oversized = parseKnowledgeBundle("x".repeat(MAX_BUNDLE_BYTES + 1));
  assert(!oversized.ok && oversized.errors.includes("Knowledge Bundle 超过 2 MB 限制。"), "超过 2 MB 应显示应用级错误");
  const duplicateQuestionBundle = { kind: "ee-knowledge-content" as const, schemaVersion: "1.0" as const, subjectAreas: [], courses: [], knowledgePoints: [{ slug: pointSlug, courseSlug, title: "验证知识点", questions: [{ key: "duplicate", question: "A" }, { key: "duplicate", question: "B" }] }], relations: [] };
  const duplicateParsed = parseKnowledgeBundle(duplicateQuestionBundle);
  assert(!duplicateParsed.ok && duplicateParsed.errors.some((error) => error.includes("Question key 重复")), "重复 Question key 未被 parse 拒绝");
  const duplicatePreview = await previewKnowledgeBundle(duplicateQuestionBundle);
  assert(!duplicatePreview.ok && duplicatePreview.errors.some((error) => error.includes("Question key 重复")), "重复 Question key 未被 preview 拒绝");
  await cleanup();
  try {
    const first = await importKnowledgeBundle(bundle()); if (!first.ok) throw new Error(`第一次导入失败：${first.errors.join("；")}`);
    const firstCounts = await counts(); assert(firstCounts.points === 2 && firstCounts.formulas === 1 && firstCounts.examples === 1 && firstCounts.questions === 1 && firstCounts.relations === 1, "第一次导入数据不完整");
    const point = await prisma.knowledgePoint.findUniqueOrThrow({ where: { slug: pointSlug } });
    await prisma.note.create({ data: { knowledgePointId: point.id, content: "用户笔记保护测试" } });
    await prisma.studyProgress.create({ data: { knowledgePointId: point.id, status: StudyStatus.LEARNING, studyCount: 1 } });
    const second = await importKnowledgeBundle(bundle()); assert(second.ok, "第二次导入失败");
    const secondCounts = await counts(); assert(JSON.stringify(firstCounts) === JSON.stringify(secondCounts), "重复导入产生了重复数据");
    const updated = await importKnowledgeBundle(bundle("更新后的验证内容")); assert(updated.ok, "更新导入失败");
    const saved = await prisma.knowledgePoint.findUniqueOrThrow({ where: { slug: pointSlug }, include: { notes: true, studyProgress: true, interviewQuestions: { include: { answers: true } } } });
    assert(saved.summary === "更新后的验证内容" && saved.commonMistakes === "容易混淆的验证错误。" && saved.interviewQuestions[0]?.answers.length === 2 && saved.notes.length === 1 && saved.studyProgress?.status === StudyStatus.LEARNING, "导入覆盖了用户数据或未更新内容");

    const portablePoint = await prisma.knowledgePoint.create({ data: { slug: portablePointSlug, title: "跨库知识点", courseId: (await prisma.course.findUniqueOrThrow({ where: { slug: courseSlug } })).id } });
    const portableBundle = { kind: "ee-knowledge-content" as const, schemaVersion: "1.0" as const, subjectAreas: [], courses: [], knowledgePoints: [{ slug: portablePointSlug, courseSlug, title: "跨库知识点", formulas: [{ key: "db:foreign-formula-id", latex: "u=v" }], examples: [{ key: "db:foreign-example-id", content: "跨库案例" }], questions: [{ key: "db:foreign-question-id", question: "跨库问题", shortAnswer: "跨库简答" }] }], relations: [] };
    const portablePreviewBefore = await previewKnowledgeBundle(portableBundle);
    assert(portablePreviewBefore.ok && portablePreviewBefore.summary.formulas.create === 1 && portablePreviewBefore.summary.formulas.update === 0 && portablePreviewBefore.summary.examples.create === 1 && portablePreviewBefore.summary.examples.update === 0 && portablePreviewBefore.summary.questions.create === 1 && portablePreviewBefore.summary.questions.update === 0, "跨数据库 db:key 首次预览未按 fallback 统计 create");
    assert((await importKnowledgeBundle(portableBundle)).ok, "跨数据库 db:key 首次导入失败");
    const portablePreviewAfter = await previewKnowledgeBundle(portableBundle);
    assert(portablePreviewAfter.ok && portablePreviewAfter.summary.formulas.create === 0 && portablePreviewAfter.summary.formulas.update === 1 && portablePreviewAfter.summary.examples.create === 0 && portablePreviewAfter.summary.examples.update === 1 && portablePreviewAfter.summary.questions.create === 0 && portablePreviewAfter.summary.questions.update === 1, "跨数据库 db:key 第二次预览未按 fallback 统计 update");
    assert((await importKnowledgeBundle(portableBundle)).ok, "跨数据库 db:key 重复导入失败");
    const portableCounts = await Promise.all([prisma.formula.count({ where: { knowledgePointId: portablePoint.id } }), prisma.example.count({ where: { knowledgePointId: portablePoint.id } }), prisma.interviewQuestion.count({ where: { knowledgePointId: portablePoint.id } })]);
    assert(portableCounts[0] === 1 && portableCounts[1] === 1 && portableCounts[2] === 1, "跨数据库 db:key 重复导入产生了重复记录");
    const portableQuestionId = questionIdForImport(portablePointSlug, "db:foreign-question-id");
    assert(await prisma.interviewAnswer.count({ where: { interviewQuestionId: portableQuestionId, answerType: "SHORT_30S" } }) === 1, "跨库 Question answer 导入失败");

    const deterministicOwner = await prisma.knowledgePoint.create({ data: { slug: deterministicOwnerSlug, title: "确定性 ID 所有者", courseId: portablePoint.courseId } });
    const deterministicTarget = await prisma.knowledgePoint.create({ data: { slug: deterministicTargetSlug, title: "确定性 ID 目标", courseId: portablePoint.courseId } });
    const deterministicFormulaId = formulaIdForImport(deterministicTargetSlug, "main");
    const deterministicExampleId = exampleIdForImport(deterministicTargetSlug, "main");
    const deterministicQuestionId = questionIdForImport(deterministicTargetSlug, "main");
    await prisma.formula.create({ data: { id: deterministicFormulaId, knowledgePointId: deterministicOwner.id, latex: "owner" } });
    await prisma.example.create({ data: { id: deterministicExampleId, knowledgePointId: deterministicOwner.id, content: "owner" } });
    await prisma.interviewQuestion.create({ data: { id: deterministicQuestionId, knowledgePointId: deterministicOwner.id, question: "owner" } });
    const deterministicBundle = { kind: "ee-knowledge-content" as const, schemaVersion: "1.0" as const, subjectAreas: [], courses: [], knowledgePoints: [{ slug: deterministicTargetSlug, courseSlug, title: "确定性 ID 目标", formulas: [{ key: "main", latex: "hijack" }], examples: [{ key: "main", content: "hijack" }], questions: [{ key: "main", question: "不能劫持" }] }], relations: [] };
    assert(!(await previewKnowledgeBundle(deterministicBundle)).ok, "确定性 fallback 指向其他知识点时未在预览拒绝");
    assert(!(await importKnowledgeBundle(deterministicBundle)).ok, "确定性 fallback 指向其他知识点时未在导入拒绝");
    const deterministicOwnership = await prisma.formula.findUniqueOrThrow({ where: { id: deterministicFormulaId } });
    const deterministicExampleOwnership = await prisma.example.findUniqueOrThrow({ where: { id: deterministicExampleId } });
    const deterministicQuestionOwnership = await prisma.interviewQuestion.findUniqueOrThrow({ where: { id: deterministicQuestionId } });
    assert(deterministicOwnership.knowledgePointId === deterministicOwner.id && deterministicExampleOwnership.knowledgePointId === deterministicOwner.id && deterministicQuestionOwnership.knowledgePointId === deterministicOwner.id, "确定性 identity ownership 失败时改变了原记录归属");
    const nativeQuestion = await prisma.interviewQuestion.create({ data: { id: "verify-native-question-owner", knowledgePointId: deterministicOwner.id, question: "native owner" } });
    const nativeBundle = { kind: "ee-knowledge-content" as const, schemaVersion: "1.0" as const, subjectAreas: [], courses: [], knowledgePoints: [{ slug: deterministicTargetSlug, courseSlug, title: "确定性 ID 目标", questions: [{ key: `db:${nativeQuestion.id}`, question: "不能劫持 native" }] }], relations: [] };
    assert(!(await previewKnowledgeBundle(nativeBundle)).ok && !(await importKnowledgeBundle(nativeBundle)).ok, "Native db:key 指向其他知识点时未拒绝");
    const nativeOwnership = await prisma.interviewQuestion.findUniqueOrThrow({ where: { id: nativeQuestion.id } });
    assert(nativeOwnership.knowledgePointId === deterministicOwner.id && nativeOwnership.question === "native owner", "Native Question ownership 失败时改变了原记录");

    const existingQuestionId = questionIdForImport(pointSlug, "common");
    const fullAnswerBundle = { kind: "ee-knowledge-content" as const, schemaVersion: "1.0" as const, subjectAreas: [], courses: [], knowledgePoints: [{ slug: pointSlug, courseSlug, title: "验证知识点", questions: [{ key: "common", question: "old", level: 4, frequency: 5, source: "original-source", shortAnswer: "A", standardAnswer: "B", deepAnswer: "C" }] }], relations: [] };
    assert((await importKnowledgeBundle(fullAnswerBundle)).ok, "Question full answer fixture 导入失败");
    let fullAnswerQuestion = await prisma.interviewQuestion.findUniqueOrThrow({ where: { id: existingQuestionId }, include: { answers: true } });
    assert(fullAnswerQuestion.answers.length === 3, "Existing SHORT/STANDARD/DEEP fixture 未完整建立");
    const partialQuestionBundle = { kind: "ee-knowledge-content" as const, schemaVersion: "1.0" as const, subjectAreas: [], courses: [], knowledgePoints: [{ slug: pointSlug, courseSlug, title: "验证知识点", questions: [{ key: "common", question: "updated", standardAnswer: "B2" }] }], relations: [] };
    assert((await importKnowledgeBundle(partialQuestionBundle)).ok, "Question partial update 失败");
    let partialQuestion = await prisma.interviewQuestion.findUniqueOrThrow({ where: { id: existingQuestionId }, include: { answers: true } });
    assert(partialQuestion.question === "updated" && partialQuestion.level === 4 && partialQuestion.frequency === 5 && partialQuestion.source === "original-source", "Question 省略 metadata 未保留原值");
    assert(partialQuestion.answers.some((answer) => answer.answerType === "SHORT_30S" && answer.content === "A") && partialQuestion.answers.some((answer) => answer.answerType === "MEDIUM_1MIN" && answer.content === "B2") && partialQuestion.answers.some((answer) => answer.answerType === "DEEP" && answer.content === "C"), "Answer omitted/string merge 失败");
    const clearQuestionBundle = { ...partialQuestionBundle, knowledgePoints: [{ ...partialQuestionBundle.knowledgePoints[0], questions: [{ key: "common", question: "updated again", source: null, deepAnswer: null }] }] };
    assert((await importKnowledgeBundle(clearQuestionBundle)).ok, "Question explicit null 更新失败");
    partialQuestion = await prisma.interviewQuestion.findUniqueOrThrow({ where: { id: existingQuestionId }, include: { answers: true } });
    assert(partialQuestion.question === "updated again" && partialQuestion.level === 4 && partialQuestion.frequency === 5 && partialQuestion.source === null, "Question source null 未清空或 metadata 被覆盖");
    assert(partialQuestion.answers.some((answer) => answer.answerType === "SHORT_30S" && answer.content === "A") && partialQuestion.answers.some((answer) => answer.answerType === "MEDIUM_1MIN" && answer.content === "B2") && !partialQuestion.answers.some((answer) => answer.answerType === "DEEP"), "Answer null/omitted 语义失败");
    const reupsertQuestionBundle = { ...partialQuestionBundle, knowledgePoints: [{ ...partialQuestionBundle.knowledgePoints[0], questions: [{ key: "common", question: "updated final", deepAnswer: "C2" }] }] };
    assert((await importKnowledgeBundle(reupsertQuestionBundle)).ok, "Question DEEP answer re-upsert 失败");
    fullAnswerQuestion = await prisma.interviewQuestion.findUniqueOrThrow({ where: { id: existingQuestionId }, include: { answers: true } });
    assert(fullAnswerQuestion.answers.some((answer) => answer.answerType === "DEEP" && answer.content === "C2"), "Question DEEP answer string 未重新写入");
    await prisma.interviewQuestion.create({ data: { id: questionIdForImport(pointSlug, "keep"), knowledgePointId: point.id, question: "Question B" } });
    assert((await importKnowledgeBundle({ ...partialQuestionBundle, knowledgePoints: [{ ...partialQuestionBundle.knowledgePoints[0], questions: [{ key: "common", question: "only A" }] }] })).ok, "Question 缺省删除回归导入失败");
    assert(Boolean(await prisma.interviewQuestion.findUnique({ where: { id: questionIdForImport(pointSlug, "keep") } })), "Bundle 缺失 Question 错误删除了现有记录");
    await prisma.knowledgePoint.update({ where: { id: point.id }, data: { commonMistakes: "old-mistake", masteryCriteria: "old-mastery" } });
    const oldBundle = { kind: "ee-knowledge-content" as const, schemaVersion: "1.0" as const, subjectAreas: [], courses: [], knowledgePoints: [{ slug: pointSlug, courseSlug, title: "旧 Bundle" }], relations: [] };
    assert((await previewKnowledgeBundle(oldBundle)).ok && (await importKnowledgeBundle(oldBundle)).ok, "旧式 Bundle 兼容性失败");
    const oldState = await prisma.knowledgePoint.findUniqueOrThrow({ where: { id: point.id }, include: { interviewQuestions: true } });
    assert(oldState.commonMistakes === "old-mistake" && oldState.masteryCriteria === "old-mastery" && oldState.interviewQuestions.length >= 2, "旧式 Bundle 清除了新增学习内容");

    const partialArea = await prisma.subjectArea.create({ data: { slug: "verify-partial-area", name: "部分更新方向", sortOrder: 41 } });
    const partialCourse = await prisma.course.create({ data: { slug: "verify-partial-course", name: "部分更新课程", sortOrder: 42, subjectAreaId: partialArea.id } });
    const partialPoint = await prisma.knowledgePoint.create({ data: { slug: "verify-partial-point", title: "部分更新知识点", courseId: partialCourse.id } });
    const partialFormula = await prisma.formula.create({ data: { knowledgePointId: partialPoint.id, id: formulaIdForImport(partialPoint.slug, "main"), latex: "a=b", sortOrder: 7 } });
    const partialExample = await prisma.example.create({ data: { knowledgePointId: partialPoint.id, id: exampleIdForImport(partialPoint.slug, "main"), content: "old", sortOrder: 8 } });
    const partialOmitted = { kind: "ee-knowledge-content" as const, schemaVersion: "1.0" as const, subjectAreas: [{ slug: partialArea.slug, name: "方向更新" }], courses: [{ slug: partialCourse.slug, name: "课程更新" }], knowledgePoints: [{ slug: partialPoint.slug, courseSlug: partialCourse.slug, title: "知识点更新", formulas: [{ key: "main", latex: "c=d" }], examples: [{ key: "main", content: "new" }] }], relations: [] };
    assert((await importKnowledgeBundle(partialOmitted)).ok, "省略字段部分更新失败");
    const omittedState = await prisma.course.findUniqueOrThrow({ where: { id: partialCourse.id } });
    const omittedFormula = await prisma.formula.findUniqueOrThrow({ where: { id: partialFormula.id } });
    const omittedExample = await prisma.example.findUniqueOrThrow({ where: { id: partialExample.id } });
    assert(omittedState.subjectAreaId === partialArea.id && omittedState.sortOrder === 42 && omittedFormula.sortOrder === 7 && omittedExample.sortOrder === 8, "省略字段不应清空关联或覆盖 sortOrder");
    const partialClear = { ...partialOmitted, courses: [{ slug: partialCourse.slug, name: "课程清除方向", subjectAreaSlug: null }] };
    assert((await importKnowledgeBundle(partialClear)).ok, "显式 null 清除 subjectArea 失败");
    const clearedCourse = await prisma.course.findUniqueOrThrow({ where: { id: partialCourse.id } });
    assert(clearedCourse.subjectAreaId === null && clearedCourse.sortOrder === 42, "显式 null 未清除 nullable 关联或覆盖 sortOrder");
    const newDefaultsBundle = { kind: "ee-knowledge-content" as const, schemaVersion: "1.0" as const, subjectAreas: [{ slug: "verify-default-area", name: "默认排序方向" }], courses: [{ slug: "verify-default-course", name: "默认排序课程", subjectAreaSlug: "verify-default-area" }], knowledgePoints: [{ slug: "verify-default-point", courseSlug: "verify-default-course", title: "默认排序知识点", formulas: [{ key: "main", latex: "x=y" }], examples: [{ key: "main", content: "默认案例" }] }], relations: [] };
    assert((await importKnowledgeBundle(newDefaultsBundle)).ok, "新记录默认 sortOrder 导入失败");
    const defaults = await prisma.course.findUniqueOrThrow({ where: { slug: "verify-default-course" }, include: { subjectArea: true, knowledgePoints: { include: { formulas: true, examples: true } } } });
    assert(defaults.sortOrder === 0 && defaults.subjectArea?.sortOrder === 0 && defaults.knowledgePoints[0]?.formulas[0]?.sortOrder === 0 && defaults.knowledgePoints[0]?.examples[0]?.sortOrder === 0, "新记录省略 sortOrder 未默认 0");

    await prisma.subjectArea.create({ data: { slug: existingAreaSlug, name: "已有方向", sortOrder: 98 } });
    await prisma.course.create({ data: { slug: existingCourseSlug, name: "已有课程", subjectAreaId: (await prisma.subjectArea.findUniqueOrThrow({ where: { slug: existingAreaSlug } })).id, sortOrder: 98 } });
    const existingCourseBundle = { kind: "ee-knowledge-content" as const, schemaVersion: "1.0" as const, subjectAreas: [], courses: [], knowledgePoints: [{ slug: "verify-existing-point", courseSlug: existingCourseSlug, title: "已有课程知识点" }], relations: [] };
    const existingPreview = await previewKnowledgeBundle(existingCourseBundle); assert(existingPreview.ok, "已有课程缺省声明时预览失败");
    const existingImport = await importKnowledgeBundle(existingCourseBundle); assert(existingImport.ok, "已有课程缺省声明时导入失败");
    const newCourseBundle = { kind: "ee-knowledge-content" as const, schemaVersion: "1.0" as const, subjectAreas: [], courses: [{ slug: newCourseSlug, name: "新课程", subjectAreaSlug: existingAreaSlug }], knowledgePoints: [], relations: [] };
    assert((await previewKnowledgeBundle(newCourseBundle)).ok, "已有方向缺省声明时预览失败"); assert((await importKnowledgeBundle(newCourseBundle)).ok, "已有方向缺省声明时导入失败");

    const hijackCourse = await prisma.course.findUniqueOrThrow({ where: { slug: courseSlug } });
    const hijackA = await prisma.knowledgePoint.create({ data: { slug: hijackASlug, title: "Formula 所有者", courseId: hijackCourse.id } });
    const hijackB = await prisma.knowledgePoint.create({ data: { slug: hijackBSlug, title: "Formula 劫持者", courseId: hijackCourse.id } });
    const formulaA = await prisma.formula.create({ data: { knowledgePointId: hijackA.id, latex: "a=b" } });
    const exampleA = await prisma.example.create({ data: { knowledgePointId: hijackA.id, content: "A" } });
    const hijackBundle = { kind: "ee-knowledge-content" as const, schemaVersion: "1.0" as const, subjectAreas: [], courses: [], knowledgePoints: [{ slug: hijackBSlug, courseSlug, title: "Formula 劫持者", formulas: [{ key: `db:${formulaA.id}`, latex: "x=y" }], examples: [{ key: `db:${exampleA.id}`, content: "B" }] }], relations: [] };
    assert(!(await previewKnowledgeBundle(hijackBundle)).ok, "Foreign db key 未在预览阶段拒绝"); assert(!(await importKnowledgeBundle(hijackBundle)).ok, "Foreign db key 未在导入阶段拒绝");
    const ownership = await prisma.formula.findUniqueOrThrow({ where: { id: formulaA.id } }); const exampleOwnership = await prisma.example.findUniqueOrThrow({ where: { id: exampleA.id } }); assert(ownership.knowledgePointId === hijackA.id && exampleOwnership.knowledgePointId === hijackA.id, "Foreign db key 改变了原记录归属");

    await prisma.subjectArea.create({ data: { slug: emptyAreaSlug, name: "空方向", sortOrder: 96 } }); await prisma.course.create({ data: { slug: emptyCourseSlug, name: "空课程", sortOrder: 97, subjectAreaId: hijackCourse.subjectAreaId } });
    const allExport = await exportKnowledgeBundle(); const emptyExport = await exportKnowledgeBundle(emptyCourseSlug); assert(allExport.subjectAreas.some((area) => area.slug === emptyAreaSlug), "全量导出缺少空专业方向"); assert(allExport.courses.some((course) => course.slug === emptyCourseSlug), "全量导出缺少空课程"); assert(emptyExport.courses.length === 1 && emptyExport.courses[0]?.slug === emptyCourseSlug && emptyExport.knowledgePoints.length === 0, "空课程筛选导出不完整");
    for (const [index, slug] of sortSlugs.entries()) await prisma.knowledgePoint.create({ data: { slug, title: slug, courseId: hijackCourse.id } });
    await prisma.knowledgeRelation.create({ data: { sourceKnowledgePointId: (await prisma.knowledgePoint.findUniqueOrThrow({ where: { slug: sortSlugs[2] } })).id, targetKnowledgePointId: (await prisma.knowledgePoint.findUniqueOrThrow({ where: { slug: sortSlugs[0] } })).id, relationType: RelationType.RELATED } });
    await prisma.knowledgeRelation.create({ data: { sourceKnowledgePointId: (await prisma.knowledgePoint.findUniqueOrThrow({ where: { slug: sortSlugs[0] } })).id, targetKnowledgePointId: (await prisma.knowledgePoint.findUniqueOrThrow({ where: { slug: sortSlugs[1] } })).id, relationType: RelationType.RELATED } });
    const sortExport = await exportKnowledgeBundle(courseSlug); const sortedRelations = sortExport.relations; assert(sortedRelations.every((item, index) => index === 0 || `${sortedRelations[index - 1]!.sourceSlug}:${sortedRelations[index - 1]!.relationType}:${sortedRelations[index - 1]!.targetSlug}` <= `${item.sourceSlug}:${item.relationType}:${item.targetSlug}`), "关系未按 slug 稳定排序");

    const serialized = JSON.stringify(allExport); assert(!serialized.includes("notes") && !serialized.includes("favorite") && !serialized.includes("studyProgress") && !serialized.includes("reviewRecords"), "导出包含用户学习数据");
    assert(allExport.knowledgePoints.length >= 2 && allExport.relations.length >= 1, "导出内容不完整");
    console.log("Content transfer verification passed", { firstCounts, secondCounts, crossDatabaseFallback: true, deterministicOwnership: true, partialUpdates: true, existingCourse: true, existingSubjectArea: true, dbKeyProtection: true, emptyAreaExport: true, emptyCourseExport: true, stableRelationSort: true, exportedPoints: allExport.knowledgePoints.length, exportedRelations: allExport.relations.length });
  } finally { await cleanup(); }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
