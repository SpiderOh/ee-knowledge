import { NextRequest, NextResponse } from "next/server";
import { exportKnowledgeBundle } from "@/features/content-transfer/service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const course = request.nextUrl.searchParams.get("course")?.trim() || undefined;
  try {
    const bundle = await exportKnowledgeBundle(course);
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(JSON.stringify(bundle, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="ee-knowledge-content-${date}.json"` } });
  } catch { return NextResponse.json({ error: "知识内容导出失败，请稍后重试。" }, { status: 500 }); }
}
