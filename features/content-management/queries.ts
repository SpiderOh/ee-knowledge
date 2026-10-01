import { prisma } from "@/lib/db";
import { parseAdminKnowledgeQueryParams } from "./schemas";

export const ADMIN_PAGE_SIZE = 20;

export async function getAdminStats() {
  const [knowledgePoints, formulas, examples, relations, courses, books, practiceQuestions] = await Promise.all([
    prisma.knowledgePoint.count(), prisma.formula.count(), prisma.example.count(), prisma.knowledgeRelation.count(), prisma.course.count(), prisma.book.count(), prisma.practiceQuestion.count(),
  ]);
  return { knowledgePoints, formulas, examples, relations, courses, books, practiceQuestions };
}

export async function getAdminKnowledgeList(input: Record<string, string | undefined>) {
  const params = parseAdminKnowledgeQueryParams(input);
  const where = {
    ...(params.q ? { OR: [{ title: { contains: params.q } }, { summary: { contains: params.q } }, { definition: { contains: params.q } }] } : {}),
    ...(params.course ? { course: { slug: params.course } } : {}),
    ...(params.reviewStatus ? { reviewStatus: params.reviewStatus } : {}),
  };
  const [items, total, courses] = await Promise.all([
    prisma.knowledgePoint.findMany({ where, orderBy: { updatedAt: "desc" }, skip: (params.page - 1) * ADMIN_PAGE_SIZE, take: ADMIN_PAGE_SIZE, select: { id: true, title: true, slug: true, category: true, reviewStatus: true, importance: true, interviewImportance: true, updatedAt: true, course: { select: { name: true, slug: true } }, formulas: { select: { id: true } }, examples: { select: { id: true } }, outgoingRelations: { select: { id: true } }, incomingRelations: { select: { id: true } }, chapters: { select: { id: true } } } }),
    prisma.knowledgePoint.count({ where }),
    prisma.course.findMany({ orderBy: { sortOrder: "asc" }, select: { name: true, slug: true } }),
  ]);
  return { items, total, page: params.page, pageCount: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)), courses, params };
}

export async function getKnowledgePointAdmin(id: string) {
  return prisma.knowledgePoint.findUnique({ where: { id }, include: {
    course: { select: { id: true, name: true, slug: true } },
    formulas: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
    examples: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
    outgoingRelations: { include: { target: { select: { id: true, title: true, slug: true } } } },
    incomingRelations: { include: { source: { select: { id: true, title: true, slug: true } } } },
    chapters: { include: { chapter: { include: { book: { select: { id: true, title: true } } } } }, orderBy: { sortOrder: "asc" } },
    practiceQuestions: { orderBy: { id: "asc" }, include: { options: { orderBy: { sortOrder: "asc" } }, _count: { select: { attempts: true } } } },
  } });
}

export async function getAdminFormOptions() {
  const [courses, rawChapters] = await Promise.all([
    prisma.course.findMany({ orderBy: [{ sortOrder: "asc" }, { slug: "asc" }], select: { id: true, name: true, slug: true } }),
    prisma.chapter.findMany({ orderBy: [{ book: { sortOrder: "asc" } }, { sortOrder: "asc" }, { id: "asc" }], select: { id: true, title: true, number: true, level: true, parentId: true, sortOrder: true, book: { select: { id: true, title: true, sortOrder: true } } } }),
  ]);
  const ordered: typeof rawChapters = [];
  const bookIds = [...new Set(rawChapters.map((chapter) => chapter.book.id))];
  for (const bookId of bookIds) {
    const bookChapters = rawChapters.filter((chapter) => chapter.book.id === bookId);
    const children = new Map<string | null, typeof rawChapters>();
    for (const chapter of bookChapters) children.set(chapter.parentId, [...(children.get(chapter.parentId) ?? []), chapter]);
    const visit = (parentId: string | null) => { for (const chapter of (children.get(parentId) ?? []).sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))) { ordered.push(chapter); visit(chapter.id); } };
    visit(null);
  }
  return { courses, chapters: ordered };
}
