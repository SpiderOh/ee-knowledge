import { AppShell } from "@/components/layout/AppShell";
import { CourseCard } from "@/components/course/CourseCard";
import { SearchForm } from "@/components/search/SearchForm";
import { calculateProgress, getCourseList } from "@/features/courses/queries";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const areas = await getCourseList();
  return <AppShell active="课程"><div className="page-header"><div><div className="eyebrow">知识库</div><h1>课程</h1><p className="subtitle">按专业方向浏览课程、教材和知识点。</p></div><SearchForm placeholder="搜索课程、教材或知识点" /></div>{areas.map((area) => <section className="course-area" key={area.id}><div className="area-heading"><h2>{area.name}</h2><span>{area.courses.length} 门课程</span></div><div className="course-grid">{area.courses.map((course) => <CourseCard key={course.id} course={course} progress={calculateProgress(course.knowledgePoints)} />)}</div>{area.courses.length === 0 && <div className="empty card">该方向还没有课程。</div>}</section>)}</AppShell>;
}
