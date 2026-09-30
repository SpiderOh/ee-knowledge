import Link from "next/link";

export default function NotFound() { return <main className="not-found"><div className="eyebrow">404</div><h1>没有找到这个页面</h1><p>链接可能已失效，或内容还没有录入知识库。</p><Link className="primary-button" href="/courses">返回课程</Link></main>; }
