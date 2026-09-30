"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";

const contentSchema = z.string().trim().min(1, "笔记不能为空。").max(10000, "笔记不能超过 10000 个字符。");
const createNoteSchema = z.object({ knowledgePointId: z.string().trim().min(1), content: contentSchema });
const updateNoteSchema = z.object({ noteId: z.string().trim().min(1), content: contentSchema });
const deleteNoteSchema = z.object({ noteId: z.string().trim().min(1) });

export async function createNote(input: { knowledgePointId: string; content: string }) {
  const parsed = createNoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message || "笔记内容无效。" } as const;
  const point = await prisma.knowledgePoint.findUnique({ where: { id: parsed.data.knowledgePointId }, select: { slug: true } });
  if (!point) return { ok: false, error: "知识点不存在。" } as const;
  let note;
  try {
    note = await prisma.note.create({ data: parsed.data, select: { id: true, content: true, createdAt: true, updatedAt: true } });
  } catch {
    return { ok: false, error: "笔记保存失败，请稍后重试。" } as const;
  }
  revalidatePath(`/knowledge/${point.slug}`);
  return { ok: true, note: { id: note.id, content: note.content, createdAt: note.createdAt.toISOString(), updatedAt: note.updatedAt.toISOString() } } as const;
}

export async function updateNote(input: { noteId: string; content: string }) {
  const parsed = updateNoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message || "笔记内容无效。" } as const;
  const note = await prisma.note.findUnique({ where: { id: parsed.data.noteId }, select: { knowledgePoint: { select: { slug: true } } } });
  if (!note) return { ok: false, error: "笔记不存在或已被删除。" } as const;
  let updated;
  try {
    updated = await prisma.note.update({ where: { id: parsed.data.noteId }, data: { content: parsed.data.content }, select: { id: true, content: true, createdAt: true, updatedAt: true } });
  } catch {
    return { ok: false, error: "笔记更新失败，请稍后重试。" } as const;
  }
  revalidatePath(`/knowledge/${note.knowledgePoint.slug}`);
  return { ok: true, note: { id: updated.id, content: updated.content, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() } } as const;
}

export async function deleteNote(input: { noteId: string }) {
  const parsed = deleteNoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "笔记参数无效。" } as const;
  const note = await prisma.note.findUnique({ where: { id: parsed.data.noteId }, select: { knowledgePoint: { select: { slug: true } } } });
  if (!note) return { ok: true } as const;
  try {
    await prisma.note.delete({ where: { id: parsed.data.noteId } });
  } catch {
    return { ok: false, error: "笔记删除失败，请稍后重试。" } as const;
  }
  revalidatePath(`/knowledge/${note.knowledgePoint.slug}`);
  return { ok: true } as const;
}
