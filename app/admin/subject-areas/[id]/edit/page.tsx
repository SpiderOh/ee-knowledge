import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { StructureForm } from "@/components/admin/StructureForm";
import { getSubjectAreaAdmin } from "@/features/structure-management/queries";
export const dynamic = "force-dynamic";
export default async function EditSubjectAreaPage({ params }: { params: Promise<{ id: string }> }) { const area = await getSubjectAreaAdmin((await params).id); if (!area) notFound(); return <AppShell active="结构管理"><div className="page-header"><div><div className="eyebrow">EDIT SUBJECT AREA</div><h1>编辑专业方向</h1></div></div><StructureForm kind="area" initial={{ id: area.id, name: area.name, slug: area.slug, description: area.description ?? "", sortOrder: String(area.sortOrder) }} /></AppShell>; }
