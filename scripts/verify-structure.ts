import { PrismaClient } from "@prisma/client";
import { linkKnowledgePointToChapter } from "@/features/content-management/actions";
import { deleteBook, deleteChapter, deleteCourse, deleteSubjectArea, saveBook, saveChapter, saveCourse, saveSubjectArea } from "@/features/structure-management/actions";

const prisma = new PrismaClient();
const prefix = "verify-structure";
function assert(condition: boolean, message: string): asserts condition { if (!condition) throw new Error(message); }

async function cleanup() {
  await prisma.chapterKnowledgePoint.deleteMany({ where: { chapter: { book: { course: { slug: { startsWith: prefix } } } } } });
  await prisma.knowledgePoint.deleteMany({ where: { slug: { startsWith: prefix } } });
  await prisma.chapter.deleteMany({ where: { book: { course: { slug: { startsWith: prefix } } } } });
  await prisma.book.deleteMany({ where: { course: { slug: { startsWith: prefix } } } });
  await prisma.course.deleteMany({ where: { slug: { startsWith: prefix } } });
  await prisma.subjectArea.deleteMany({ where: { slug: { startsWith: prefix } } });
}

async function main() {
  const existingLinks = await prisma.chapterKnowledgePoint.findMany({ select: { chapter: { select: { book: { select: { courseId: true } } } }, knowledgePoint: { select: { courseId: true } } } });
  assert(existingLinks.every((link) => link.chapter.book.courseId === link.knowledgePoint.courseId), "Demo 存在跨 Course ChapterKnowledgePoint 关联");
  await cleanup();
  try {
    const area = await saveSubjectArea({ name: "验证方向", slug: `${prefix}-area`, description: null, sortOrder: 1 }); assert(area.ok, "SubjectArea 创建失败");
    const areaRecord = await prisma.subjectArea.findUniqueOrThrow({ where: { slug: `${prefix}-area` } });
    const areaEdit = await saveSubjectArea({ id: areaRecord.id, name: "验证方向更新", slug: `${prefix}-area-renamed`, description: "更新", sortOrder: 2 }); assert(areaEdit.ok, "SubjectArea 编辑或 slug 修改失败");
    const course = await saveCourse({ name: "验证课程", slug: `${prefix}-course`, subjectAreaId: areaRecord.id, description: null, sortOrder: 1 }); assert(course.ok, "Course 创建失败");
    const courseRecord = await prisma.course.findUniqueOrThrow({ where: { slug: `${prefix}-course` } });
    assert((await saveCourse({ id: courseRecord.id, name: "验证课程更新", slug: `${prefix}-course-renamed`, subjectAreaId: null, description: "更新", sortOrder: 2 })).ok, "Course 编辑或 slug 修改失败");
    assert((await saveCourse({ id: courseRecord.id, name: "验证课程更新", slug: `${prefix}-course`, subjectAreaId: areaRecord.id, description: "更新", sortOrder: 2 })).ok, "Course 移动 SubjectArea 失败");
    assert(!(await deleteSubjectArea(areaRecord.id)).ok, "有 Course 的 SubjectArea 不应删除");
    const book = await saveBook({ courseId: courseRecord.id, title: "验证教材", author: null, publisher: null, edition: null, isbn: null, description: null, cover: null, sortOrder: 1 }); assert(book.ok, "Book 创建失败");
    const bookRecord = await prisma.book.findUniqueOrThrow({ where: { id: book.id } });
    assert((await saveBook({ id: bookRecord.id, courseId: courseRecord.id, title: "验证教材更新", author: "作者", publisher: null, edition: null, isbn: null, description: null, cover: "/media/books/test.jpg", sortOrder: 2 })).ok, "Book 编辑失败");
    assert(!(await deleteCourse(courseRecord.id)).ok, "有 Book 的 Course 不应删除");
    const root = await saveChapter({ bookId: bookRecord.id, title: "第一章", number: "1", parentId: null, sortOrder: 1 }); assert(root.ok, "根章节创建失败");
    const rootRecord = await prisma.chapter.findUniqueOrThrow({ where: { id: root.id } }); assert(rootRecord.level === 1, "根章节 level 应为 1");
    const child = await saveChapter({ bookId: bookRecord.id, title: "1.1", number: "1.1", parentId: rootRecord.id, sortOrder: 1 }); assert(child.ok, "子章节创建失败");
    const childRecord = await prisma.chapter.findUniqueOrThrow({ where: { id: child.id } }); assert(childRecord.level === 2, "子章节 level 应由 Server 计算");
    const grandchild = await saveChapter({ bookId: bookRecord.id, title: "1.1.1", number: "1.1.1", parentId: childRecord.id, sortOrder: 1 }); assert(grandchild.ok, "孙章节创建失败");
    const grandchildRecord = await prisma.chapter.findUniqueOrThrow({ where: { id: grandchild.id } }); assert(grandchildRecord.level === 3, "孙章节 level 应由 Server 计算");
    assert(!(await saveChapter({ id: rootRecord.id, bookId: bookRecord.id, title: rootRecord.title, number: rootRecord.number, parentId: childRecord.id, sortOrder: 1 })).ok, "章节不能移动到自己的 descendant");
    assert(!(await saveChapter({ id: rootRecord.id, bookId: bookRecord.id, title: rootRecord.title, number: rootRecord.number, parentId: rootRecord.id, sortOrder: 1 })).ok, "章节不能 parent 自己");
    assert((await saveChapter({ id: childRecord.id, bookId: bookRecord.id, title: childRecord.title, number: childRecord.number, parentId: null, sortOrder: 2 })).ok, "章节移动到根节点失败");
    const movedChild = await prisma.chapter.findUniqueOrThrow({ where: { id: childRecord.id } }); const movedGrandchild = await prisma.chapter.findUniqueOrThrow({ where: { id: grandchildRecord.id } }); assert(movedChild.level === 1 && movedGrandchild.level === 2, "章节移动后 descendants level 未递归更新");
    const secondCourse = await saveCourse({ name: "验证第二课程", slug: `${prefix}-course-two`, subjectAreaId: null, description: null, sortOrder: 2 }); assert(secondCourse.ok, "第二课程创建失败");
    const secondCourseRecord = await prisma.course.findUniqueOrThrow({ where: { slug: `${prefix}-course-two` } });
    const secondBook = await saveBook({ courseId: secondCourseRecord.id, title: "第二教材", author: null, publisher: null, edition: null, isbn: null, description: null, cover: null, sortOrder: 1 }); assert(secondBook.ok, "第二教材创建失败");
    const secondBookRecord = await prisma.book.findUniqueOrThrow({ where: { id: secondBook.id } });
    assert((await saveBook({ id: secondBookRecord.id, courseId: courseRecord.id, title: secondBookRecord.title, author: null, publisher: null, edition: null, isbn: null, description: null, cover: null, sortOrder: 1 })).ok, "空 Book 移动 Course 失败");
    assert(!(await saveChapter({ bookId: secondBookRecord.id, title: "非法父章节", number: null, parentId: rootRecord.id, sortOrder: 1 })).ok, "跨 Book parent 应拒绝");
    const point = await prisma.knowledgePoint.create({ data: { slug: `${prefix}-point`, title: "验证知识点", courseId: courseRecord.id } });
    const foreignPoint = await prisma.knowledgePoint.create({ data: { slug: `${prefix}-foreign-point`, title: "跨课程知识点", courseId: secondCourseRecord.id } });
    assert((await linkKnowledgePointToChapter({ knowledgePointId: point.id, chapterId: rootRecord.id, sortOrder: 1 })).ok, "同 Course 章节关联失败");
    assert(!(await linkKnowledgePointToChapter({ knowledgePointId: foreignPoint.id, chapterId: rootRecord.id, sortOrder: 1 })).ok, "跨 Course 章节关联应拒绝");
    assert(!(await deleteChapter(rootRecord.id)).ok, "有 child 或知识点关联的 Chapter 不应删除");
    assert(!(await deleteBook(bookRecord.id)).ok, "有 Chapter 的 Book 不应删除");
    assert(!(await saveBook({ id: bookRecord.id, courseId: secondCourseRecord.id, title: bookRecord.title, author: null, publisher: null, edition: null, isbn: null, description: null, cover: null, sortOrder: 1 })).ok, "存在跨课程知识点关联时 Book 移动应拒绝");
    await prisma.chapterKnowledgePoint.deleteMany({ where: { chapterId: rootRecord.id } });
    assert((await deleteChapter(movedGrandchild.id)).ok, "空 leaf Chapter 删除失败");
    assert((await deleteChapter(movedChild.id)).ok, "移动后的空 Chapter 删除失败");
    assert((await deleteChapter(rootRecord.id)).ok, "空 root Chapter 删除失败");
    assert((await deleteBook(bookRecord.id)).ok, "空 Book 删除失败");
    assert((await deleteBook(secondBookRecord.id)).ok, "第二个空 Book 删除失败");
    assert(!(await deleteCourse(courseRecord.id)).ok, "有 KnowledgePoint 的 Course 不应删除");
    await prisma.knowledgePoint.delete({ where: { id: point.id } }); await prisma.knowledgePoint.delete({ where: { id: foreignPoint.id } });
    assert((await deleteCourse(courseRecord.id)).ok, "空 Course 删除失败");
    assert((await deleteCourse(secondCourseRecord.id)).ok, "未分类空 Course 删除失败");
    assert((await deleteSubjectArea(areaRecord.id)).ok, "空 SubjectArea 删除失败");
    console.log("Structure verification passed", { subjectAreaCrud: true, courseCrud: true, bookCrud: true, chapterTree: true, safeDelete: true, courseConsistency: true, crossBookParent: true });
  } finally { await cleanup(); }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
