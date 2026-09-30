import { z } from "zod";
import { prisma } from "@/lib/db";

const optionalFilter = z.preprocess((value) => typeof value === "string" && value.trim() === "" ? undefined : value, z.string().trim().min(1).optional());
const searchParamsSchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
  course: optionalFilter,
  book: optionalFilter,
});

export type SearchParamsInput = Record<string, string | string[] | undefined>;
export type SearchParams = z.infer<typeof searchParamsSchema>;

function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }

export function parseSearchParams(input: SearchParamsInput): SearchParams {
  const normalized = { q: first(input.q), course: first(input.course), book: first(input.book) };
  const parsed = searchParamsSchema.safeParse(normalized);
  if (parsed.success) return parsed.data;
  const query = z.string().trim().max(100).safeParse(normalized.q);
  const course = optionalFilter.safeParse(normalized.course);
  const book = optionalFilter.safeParse(normalized.book);
  return { q: query.success ? query.data : "", course: course.success ? course.data : undefined, book: book.success ? book.data : undefined };
}

export async function getSearchResults(params: SearchParams) {
  const text = params.q;
  const courseFilter = params.course ? { course: { slug: params.course } } : {};
  const bookFilter = params.book ? { chapters: { some: { chapter: { bookId: params.book } } } } : {};
  const textFilter = text ? { OR: [{ title: { contains: text } }, { summary: { contains: text } }, { definition: { contains: text } }] } : {};
  const courseTextFilter = text ? { OR: [{ name: { contains: text } }, { description: { contains: text } }] } : {};
  const bookTextFilter = text ? { OR: [{ title: { contains: text } }, { author: { contains: text } }, { publisher: { contains: text } }] } : {};

  const [knowledgePoints, courses, books] = await Promise.all([
    prisma.knowledgePoint.findMany({ where: { AND: [textFilter, courseFilter, bookFilter] }, select: { slug: true, title: true, summary: true, category: true, importance: true, interviewImportance: true, course: { select: { name: true } } }, orderBy: { title: "asc" }, take: 100 }),
    prisma.course.findMany({ where: { AND: [courseTextFilter, params.course ? { slug: params.course } : {}] }, select: { slug: true, name: true, description: true, _count: { select: { books: true, knowledgePoints: true } } }, orderBy: { sortOrder: "asc" }, take: 100 }),
    prisma.book.findMany({ where: { AND: [bookTextFilter, params.course ? { course: { slug: params.course } } : {}, params.book ? { id: params.book } : {}] }, select: { id: true, title: true, author: true, publisher: true, edition: true, course: { select: { name: true } } }, orderBy: { title: "asc" }, take: 100 }),
  ]);
  return { knowledgePoints, courses, books };
}

export async function getSearchFilters() {
  return prisma.course.findMany({ select: { slug: true, name: true }, orderBy: { sortOrder: "asc" } });
}
