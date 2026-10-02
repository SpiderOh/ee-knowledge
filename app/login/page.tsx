import Link from "next/link";

type LoginPageProps = { searchParams: Promise<{ error?: string; next?: string }> };

function safeNext(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /^[a-z][a-z\d+.-]*:/i.test(value)) return "/";
  return value;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const error = params.error === "config" ? "Authentication 尚未配置，请先在服务器环境变量中完成配置。" : params.error === "invalid" ? "登录失败，请检查密码。" : "";
  return <main className="login-page"><section className="login-card" aria-labelledby="login-title"><div className="login-brand">研电 <span>·</span> EE Knowledge</div><p className="login-kicker">个人知识库</p><h1 id="login-title">登录</h1><p className="login-description">单用户个人系统</p><form className="login-form" action="/api/auth/login" method="post"><input type="hidden" name="next" value={next} /><label htmlFor="password">密码</label><input id="password" name="password" type="password" autoComplete="current-password" required minLength={12} maxLength={128} autoFocus /><button type="submit">登录</button>{error ? <p className="login-error" role="alert">{error}</p> : null}</form><Link className="login-home" href="/">返回首页</Link></section></main>;
}
