import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

type ConsistencyDb = Pick<typeof prisma, "chapterKnowledgePoint"> | Prisma.TransactionClient;

export async function hasKnowledgePointCourseConflict(db: ConsistencyDb, knowledgePointId: string, target: { courseId?: string; courseSlug?: string }) {
  const links = await db.chapterKnowledgePoint.findMany({ where: { knowledgePointId }, select: { chapter: { select: { book: { select: { courseId: true, course: { select: { slug: true } } } } } } } });
  return links.some((link) => target.courseId ? link.chapter.book.courseId !== target.courseId : link.chapter.book.course.slug !== target.courseSlug);
}

export async function validateKnowledgePointCourseChange(db: ConsistencyDb, knowledgePointId: string, targetCourseId: string) {
  return !(await hasKnowledgePointCourseConflict(db, knowledgePointId, { courseId: targetCourseId }));
}

export async function validateKnowledgePointCourseSlug(db: ConsistencyDb, knowledgePointId: string, targetCourseSlug: string) {
  return !(await hasKnowledgePointCourseConflict(db, knowledgePointId, { courseSlug: targetCourseSlug }));
}
