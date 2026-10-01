import { prisma } from "@/lib/db";

export async function getStructureOverview() {
  return prisma.subjectArea.findMany({ orderBy: [{ sortOrder: "asc" }, { slug: "asc" }], select: { id: true, name: true, slug: true, description: true, sortOrder: true, _count: { select: { courses: true } }, courses: { orderBy: [{ sortOrder: "asc" }, { slug: "asc" }], select: { id: true, name: true, slug: true, sortOrder: true, _count: { select: { books: true, knowledgePoints: true } }, books: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { id: true, title: true, sortOrder: true, _count: { select: { chapters: true } } } } } } } });
}

export async function getUngroupedStructureCourses() {
  return prisma.course.findMany({ where: { subjectAreaId: null }, orderBy: [{ sortOrder: "asc" }, { slug: "asc" }], select: { id: true, name: true, slug: true, sortOrder: true, _count: { select: { books: true, knowledgePoints: true } }, books: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { id: true, title: true, _count: { select: { chapters: true } } } } } });
}

export async function getStructureFormOptions() {
  const [areas, courses] = await Promise.all([prisma.subjectArea.findMany({ orderBy: [{ sortOrder: "asc" }, { slug: "asc" }], select: { id: true, name: true, slug: true } }), prisma.course.findMany({ orderBy: [{ sortOrder: "asc" }, { slug: "asc" }], select: { id: true, name: true, slug: true } })]);
  return { areas, courses };
}

export async function getSubjectAreaAdmin(id: string) { return prisma.subjectArea.findUnique({ where: { id }, include: { _count: { select: { courses: true } } } }); }
export async function getCourseAdmin(id: string) { return prisma.course.findUnique({ where: { id }, include: { subjectArea: true, _count: { select: { books: true, knowledgePoints: true } } } }); }
export async function getBookAdmin(id: string) { return prisma.book.findUnique({ where: { id }, include: { course: true, _count: { select: { chapters: true } } } }); }
export async function getBookChaptersAdmin(bookId: string) { return prisma.book.findUnique({ where: { id: bookId }, include: { course: true, chapters: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { id: true, bookId: true, parentId: true, title: true, number: true, level: true, sortOrder: true, _count: { select: { children: true, knowledgePoints: true } } } }, _count: { select: { chapters: true } } } }); }
