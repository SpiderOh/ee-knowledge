import { AppShell } from "@/components/layout/AppShell";
import { StructureForm } from "@/components/admin/StructureForm";
export default function NewSubjectAreaPage() { return <AppShell active="结构管理"><div className="page-header"><div><div className="eyebrow">NEW SUBJECT AREA</div><h1>新建专业方向</h1></div></div><StructureForm kind="area" /></AppShell>; }
