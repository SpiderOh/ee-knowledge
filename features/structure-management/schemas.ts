import { z } from "zod";

const text = z.string().trim().max(50000).nullable().optional();
const order = z.preprocess((value) => value === "" || value === undefined ? 0 : typeof value === "string" ? Number(value) : value, z.number().int().min(0));
const id = z.string().trim().min(1);
const slug = z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug 只能使用小写英文、数字和连字符。");

export const subjectAreaInputSchema = z.object({ id: id.optional(), name: z.string().trim().min(1, "名称不能为空。").max(200), slug, description: text, sortOrder: order });
export const courseInputSchema = z.object({ id: id.optional(), name: z.string().trim().min(1, "名称不能为空。").max(200), slug, subjectAreaId: id.nullable().optional(), description: text, sortOrder: order });
export const bookInputSchema = z.object({ id: id.optional(), courseId: id, title: z.string().trim().min(1, "书名不能为空。").max(300), author: text, publisher: text, edition: text, isbn: text, description: text, cover: text, sortOrder: order });
export const chapterInputSchema = z.object({ id: id.optional(), bookId: id, title: z.string().trim().min(1, "章节标题不能为空。").max(300), number: z.string().trim().max(100).nullable().optional(), parentId: id.nullable().optional(), sortOrder: order });

export type SubjectAreaInput = z.infer<typeof subjectAreaInputSchema>;
export type CourseInput = z.infer<typeof courseInputSchema>;
export type BookInput = z.infer<typeof bookInputSchema>;
export type ChapterInput = z.infer<typeof chapterInputSchema>;
