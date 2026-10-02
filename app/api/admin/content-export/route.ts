import { NextRequest, NextResponse } from "next/server";
import { exportKnowledgeBundle } from "@/features/content-transfer/service";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!await verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value)) return NextResponse.json({ error: "未登录。" }, { status: 401 });
  const course = request.nextUrl.searchParams.get("course")?.trim() || undefined;
  try {
    const bundle = await exportKnowledgeBundle(course);
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(JSON.stringify(bundle, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="ee-knowledge-content-${date}.json"` } });
  } catch { return NextResponse.json({ error: "知识内容导出失败，请稍后重试。" }, { status: 500 }); }
}
