import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { KnowledgeEditor } from "@/components/admin/KnowledgeEditor";
import { getKnowledgePointAdmin, getAdminFormOptions } from "@/features/content-management/queries";

export const dynamic = "force-dynamic";

export default async function EditKnowledgePage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const [point, options] = await Promise.all([getKnowledgePointAdmin(id), getAdminFormOptions()]); if (!point) notFound(); return <AppShell active="内容管理"><div className="page-header"><div><div className="eyebrow">EDIT KNOWLEDGE POINT</div><h1>编辑：{point.title}</h1><p className="subtitle">ID：{point.id}</p></div></div><KnowledgeEditor mode="edit" point={point} courses={options.courses} chapters={options.chapters} /></AppShell>; }
