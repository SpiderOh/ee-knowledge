import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getQuickLearningCourse, pickQuickLearningPoint } from "@/features/quick-learning/queries";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function clean(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length <= 100 ? trimmed : undefined;
}

export default async function QuickLearningPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = await searchParams;
  const courseSlug = clean(first(raw.course));
  const excludeSlug = clean(first(raw.exclude));
  if (courseSlug && !(await getQuickLearningCourse(courseSlug))) notFound();

  const point = await pickQuickLearningPoint({ courseSlug, excludeSlug });
  if (point) {
    const scope = courseSlug ? `&quickCourse=${encodeURIComponent(courseSlug)}` : "";
    redirect(`/knowledge/${point.slug}?quick=1${scope}`);
  }

  const backHref = courseSlug ? `/courses/${courseSlug}` : "/courses";
  return <AppShell active="课程"><div className="page-header"><div><div className="eyebrow">QUICK LEARNING</div><h1>{courseSlug ? "本课程暂时没有可学习知识点" : "暂时没有可学习知识点"}</h1><p className="subtitle">添加知识点后，就可以从这里随机开始学习。</p></div></div><div className="card empty"><Link className="primary-button" href={backHref}>{courseSlug ? "返回课程" : "浏览课程"}</Link></div></AppShell>;
}
