import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { StructureForm } from "@/components/admin/StructureForm";
import { getBookAdmin, getStructureFormOptions } from "@/features/structure-management/queries";
export const dynamic = "force-dynamic";
export default async function EditBookPage({ params }: { params: Promise<{ id: string }> }) { const id = (await params).id; const [book, options] = await Promise.all([getBookAdmin(id), getStructureFormOptions()]); if (!book) notFound(); return <AppShell active="结构管理"><div className="page-header"><div><div className="eyebrow">EDIT BOOK</div><h1>编辑教材</h1><p className="subtitle">{book._count.chapters} 个章节。修改课程时会检查章节知识点课程一致性。</p></div></div><StructureForm kind="book" options={options.courses} initial={{ id: book.id, courseId: book.courseId, title: book.title, author: book.author ?? "", publisher: book.publisher ?? "", edition: book.edition ?? "", isbn: book.isbn ?? "", description: book.description ?? "", cover: book.cover ?? "", sortOrder: String(book.sortOrder) }} /></AppShell>; }
