import type { Prisma, StudyStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

export type QuickLearningBucket = "review" | "learning" | "not-started" | "mastered";

export type QuickLearningPoint = {
  id: string;
  slug: string;
  title: string;
  course: { name: string; slug: string };
  studyStatus: StudyStatus;
  bucket: QuickLearningBucket;
};

type PickOptions = {
  courseSlug?: string;
  excludeSlug?: string;
  random?: () => number;
};

const bucketStatuses: Array<{ bucket: QuickLearningBucket; status: StudyStatus }> = [
  { bucket: "review", status: "REVIEW" },
  { bucket: "learning", status: "LEARNING" },
  { bucket: "not-started", status: "NOT_STARTED" },
  { bucket: "mastered", status: "MASTERED" },
];

function baseWhere({ courseSlug, excludeSlug }: PickOptions): Prisma.KnowledgePointWhereInput {
  return {
    ...(courseSlug ? { course: { slug: courseSlug } } : {}),
    ...(excludeSlug ? { NOT: { slug: excludeSlug } } : {}),
  };
}

function bucketWhere(base: Prisma.KnowledgePointWhereInput, bucket: QuickLearningBucket, status: StudyStatus): Prisma.KnowledgePointWhereInput {
  if (bucket === "not-started") {
    return { ...base, OR: [{ studyProgress: { is: null } }, { studyProgress: { is: { status } } }] };
  }
  return { ...base, studyProgress: { is: { status } } };
}

async function pickFromBucket(where: Prisma.KnowledgePointWhereInput, bucket: QuickLearningBucket, random: () => number): Promise<QuickLearningPoint | null> {
  const count = await prisma.knowledgePoint.count({ where });
  if (count === 0) return null;
  const value = random();
  const normalized = Number.isFinite(value) ? Math.max(0, Math.min(0.999999999, value)) : 0;
  const point = await prisma.knowledgePoint.findFirst({
    where,
    orderBy: { id: "asc" },
    skip: Math.min(count - 1, Math.floor(normalized * count)),
    select: {
      id: true,
      slug: true,
      title: true,
      course: { select: { name: true, slug: true } },
      studyProgress: { select: { status: true } },
    },
  });
  if (!point) return null;
  return {
    id: point.id,
    slug: point.slug,
    title: point.title,
    course: point.course,
    studyStatus: point.studyProgress?.status ?? "NOT_STARTED",
    bucket,
  };
}

async function pickWithExclusion(options: PickOptions): Promise<QuickLearningPoint | null> {
  const random = options.random ?? Math.random;
  const base = baseWhere(options);
  for (const { bucket, status } of bucketStatuses) {
    const point = await pickFromBucket(bucketWhere(base, bucket, status), bucket, random);
    if (point) return point;
  }
  return null;
}

export async function pickQuickLearningPoint(options: PickOptions = {}): Promise<QuickLearningPoint | null> {
  const point = await pickWithExclusion(options);
  if (point || !options.excludeSlug) return point;
  return pickWithExclusion({ ...options, excludeSlug: undefined });
}

export async function getQuickLearningCourse(slug: string) {
  return prisma.course.findUnique({ where: { slug }, select: { id: true, slug: true, name: true } });
}
