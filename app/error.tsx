"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <main className="not-found"><div className="eyebrow">出错了</div><h1>页面暂时无法加载</h1><p>请重试，或返回课程继续浏览。</p><div className="error-actions"><button className="primary-button" onClick={() => reset()}>重试</button><Link className="secondary-button" href="/courses">返回课程</Link></div></main>;
}
