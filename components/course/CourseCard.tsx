import Link from "next/link";

export function CourseCard({ course, progress }: { course: { name: string; slug: string; description: string | null; _count: { books: number; knowledgePoints: number } }; progress: number }) {
  return <Link className="course course-card" href={`/courses/${course.slug}`}><div><div className="course-name">{course.name}</div><div className="course-description">{course.description || "暂未添加课程简介"}</div><div className="course-meta">{course._count.books} 本教材 · {course._count.knowledgePoints} 个知识点</div><div className="progress"><span style={{ width: `${progress}%` }} /></div><div className="progress-label">学习进度 {progress}%</div></div><span className="arrow">›</span></Link>;
}
