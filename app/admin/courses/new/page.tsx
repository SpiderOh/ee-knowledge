import { AppShell } from "@/components/layout/AppShell";
import { StructureForm } from "@/components/admin/StructureForm";
import { getStructureFormOptions } from "@/features/structure-management/queries";
export const dynamic = "force-dynamic";
export default async function NewCoursePage() { const options = await getStructureFormOptions(); return <AppShell active="结构管理"><div className="page-header"><div><div className="eyebrow">NEW COURSE</div><h1>新建课程</h1></div></div><StructureForm kind="course" areas={options.areas} /></AppShell>; }
