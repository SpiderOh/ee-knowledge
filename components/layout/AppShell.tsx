import Link from "next/link";

const nav = [
  ["首页", "/"],
  ["知识库", "/courses"],
  ["课程", "/courses"],
  ["教材", "/courses"],
  ["收藏", "/favorites"],
  ["复习中心", null],
  ["复试题库", null],
  ["学习统计", null],
] as const;

export function AppShell({ children, active = "" }: { children: React.ReactNode; active?: string }) {
  return <div className="shell"><aside className="sidebar"><Link className="brand" href="/">研电 <span>·</span> EE Knowledge</Link><div className="nav-label">工作台</div>{nav.map(([label, href]) => href ? <Link className={`nav-item ${active === label ? "active" : ""}`} href={href} key={label}>{label}</Link> : <span className="nav-item nav-disabled" key={label}>{label}<small>开发中</small></span>)}<div className="nav-label">管理</div><Link className={`nav-item ${active === "内容管理" ? "active" : ""}`} href="/admin">内容管理</Link><Link className={`nav-item ${active === "结构管理" ? "active" : ""}`} href="/admin/structure">结构管理</Link><span className="nav-item nav-disabled">设置<small>开发中</small></span></aside><main className="main">{children}</main><nav className="mobile-nav" aria-label="移动端导航"><Link className={active === "首页" ? "active" : ""} href="/">首页</Link><Link className={active === "课程" || active === "教材" ? "active" : ""} href="/courses">课程</Link><Link className={active === "知识库" ? "active" : ""} href="/search">搜索</Link><Link className={active === "收藏" ? "active" : ""} href="/favorites">收藏</Link></nav></div>;
}
