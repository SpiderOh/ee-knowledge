import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { StructureForm } from "@/components/admin/StructureForm";
import { getStructureFormOptions } from "@/features/structure-management/queries";
export const dynamic = "force-dynamic";
export default async function NewBookPage({ searchParams }: { searchParams: Promise<{ courseId?: string }> }) { const [options, query] = await Promise.all([getStructureFormOptions(), searchParams]); if (!options.courses.length) return <AppShell active="结构管理"><div className="card empty"><p>请先创建课程。</p><Link href="/admin/courses/new" className="primary-button">去创建课程</Link></div></AppShell>; return <AppShell active="结构管理"><div className="page-header"><div><div className="eyebrow">NEW BOOK</div><h1>新建教材</h1></div></div><StructureForm kind="book" options={options.courses} initial={query.courseId ? { courseId: query.courseId } : undefined} /></AppShell>; }
