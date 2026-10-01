import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { StructureForm } from "@/components/admin/StructureForm";
import { getCourseAdmin, getStructureFormOptions } from "@/features/structure-management/queries";
export const dynamic = "force-dynamic";
export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) { const id = (await params).id; const [course, options] = await Promise.all([getCourseAdmin(id), getStructureFormOptions()]); if (!course) notFound(); return <AppShell active="结构管理"><div className="page-header"><div><div className="eyebrow">EDIT COURSE</div><h1>编辑课程</h1><p className="subtitle">当前包含 {course._count.books} 本教材 / {course._count.knowledgePoints} 个知识点。</p></div></div><StructureForm kind="course" areas={options.areas} initial={{ id: course.id, name: course.name, slug: course.slug, subjectAreaId: course.subjectAreaId ?? "", description: course.description ?? "", sortOrder: String(course.sortOrder) }} /></AppShell>; }
