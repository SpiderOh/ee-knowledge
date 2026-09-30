import { AppShell } from "@/components/layout/AppShell";
import { KnowledgeEditor } from "@/components/admin/KnowledgeEditor";
import { getAdminFormOptions } from "@/features/content-management/queries";

export const dynamic = "force-dynamic";

export default async function NewKnowledgePage() { const options = await getAdminFormOptions(); return <AppShell active="内容管理"><div className="page-header"><div><div className="eyebrow">NEW KNOWLEDGE POINT</div><h1>新建知识点</h1><p className="subtitle">创建后可继续添加公式、案例、关系和教材位置。</p></div></div><KnowledgeEditor mode="create" courses={options.courses} chapters={options.chapters} /></AppShell>; }
