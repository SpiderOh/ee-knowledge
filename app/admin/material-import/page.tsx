import { AppShell } from "@/components/layout/AppShell";
import { MaterialImportPanel } from "@/components/admin/MaterialImportPanel";
import { getAdminFormOptions } from "@/features/content-management/queries";

export const dynamic = "force-dynamic";

export default async function MaterialImportPage() {
  const { courses } = await getAdminFormOptions();
  return <AppShell active="内容管理"><div className="page-header"><div><div className="eyebrow">PERSONAL MATERIAL IMPORT</div><h1>个人资料导入</h1><p className="subtitle">将 Markdown 或 TXT 资料整理为一个可审核的 KnowledgePoint 草稿。</p></div></div><MaterialImportPanel courses={courses} /></AppShell>;
}
