import Link from "next/link";
import type { QuickLearningBucket } from "@/features/quick-learning/queries";

const bucketLabels: Record<QuickLearningBucket, string> = {
  review: "需要复习",
  learning: "学习中",
  "not-started": "未学习",
  mastered: "已掌握 · 回顾",
};

export function QuickLearningBar({ slug, bucket, courseSlug }: { slug: string; bucket: QuickLearningBucket; courseSlug?: string }) {
  const scope = courseSlug ? `&course=${encodeURIComponent(courseSlug)}` : "";
  return <div className="quick-learning-bar" aria-label="快速学习">
    <div><span className="eyebrow">快速学习</span><strong>当前：{bucketLabels[bucket]}</strong></div>
    <div className="quick-learning-actions">
      <Link className="secondary-button" href={`/quick-learn?exclude=${encodeURIComponent(slug)}${scope}`}>换一个</Link>
      <Link className="text-button" href={`/knowledge/${slug}`}>退出快速学习</Link>
    </div>
  </div>;
}
