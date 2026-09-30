import { AppShell } from "@/components/layout/AppShell";
import { ContentTransferPanel } from "@/components/admin/ContentTransferPanel";
import { getAdminFormOptions } from "@/features/content-management/queries";

export const dynamic = "force-dynamic";

export default async function ImportExportPage() { const { courses } = await getAdminFormOptions(); return <AppShell active="内容管理"><div className="page-header"><div><div className="eyebrow">KNOWLEDGE BUNDLE V1</div><h1>JSON 导入 / 导出</h1><p className="subtitle">Knowledge Bundle 是知识内容交换格式，不是数据库备份，也不包含用户学习数据。</p></div></div><ContentTransferPanel courses={courses} /></AppShell>; }
