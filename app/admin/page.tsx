import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { getAdminStats } from "@/features/content-management/queries";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const stats = await getAdminStats();
  const cards = [["知识点", stats.knowledgePoints, "/admin/knowledge"], ["Formula", stats.formulas, "/admin/knowledge"], ["Example", stats.examples, "/admin/knowledge"], ["KnowledgeRelation", stats.relations, "/admin/knowledge"], ["课程", stats.courses, "/courses"], ["教材", stats.books, "/courses"]] as const;
  return <AppShell active="内容管理"><div className="page-header"><div><div className="eyebrow">CONTENT MANAGEMENT</div><h1>内容管理</h1><p className="subtitle">维护正式知识内容，并通过 Knowledge Bundle 进行交换。</p></div></div><div className="admin-notice card">当前管理后台未配置身份认证，仅适合本地使用或可信网络。未来公开部署前必须增加 Authentication。</div><div className="grid admin-stat-grid">{cards.map(([label, value, href]) => <Link className="card admin-stat-card" href={href} key={label}><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong><span className="admin-card-arrow">进入管理 →</span></Link>)}</div><div className="admin-entry-grid"><Link className="card admin-entry" href="/admin/knowledge"><strong>管理知识点</strong><span>创建、编辑、删除知识点及其公式、案例、关系和教材位置。</span></Link><Link className="card admin-entry" href="/admin/import-export"><strong>JSON 导入 / 导出</strong><span>预览并合并 Knowledge Bundle v1，导出稳定的知识内容 JSON。</span></Link></div></AppShell>;
}
