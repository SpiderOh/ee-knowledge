-- CreateTable
CREATE TABLE "SubjectArea" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subjectAreaId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Course_subjectAreaId_fkey" FOREIGN KEY ("subjectAreaId") REFERENCES "SubjectArea" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "publisher" TEXT,
    "edition" TEXT,
    "isbn" TEXT,
    "description" TEXT,
    "cover" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Book_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Chapter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookId" TEXT NOT NULL,
    "parentId" TEXT,
    "title" TEXT NOT NULL,
    "number" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Chapter_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Chapter_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Chapter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KnowledgePoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'CONCEPT',
    "summary" TEXT,
    "definition" TEXT,
    "plainExplanation" TEXT,
    "principle" TEXT,
    "physicalMeaning" TEXT,
    "engineeringMeaning" TEXT,
    "importance" INTEGER NOT NULL DEFAULT 3,
    "interviewImportance" INTEGER NOT NULL DEFAULT 3,
    "difficulty" INTEGER NOT NULL DEFAULT 3,
    "reviewStatus" TEXT NOT NULL DEFAULT 'AI_DRAFT',
    "source" TEXT,
    "sourceBook" TEXT,
    "sourceChapter" TEXT,
    "sourcePage" TEXT,
    "confidence" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "KnowledgePoint_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChapterKnowledgePoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chapterId" TEXT NOT NULL,
    "knowledgePointId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    CONSTRAINT "ChapterKnowledgePoint_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChapterKnowledgePoint_knowledgePointId_fkey" FOREIGN KEY ("knowledgePointId") REFERENCES "KnowledgePoint" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Formula" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "knowledgePointId" TEXT NOT NULL,
    "name" TEXT,
    "latex" TEXT NOT NULL,
    "description" TEXT,
    "conditions" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Formula_knowledgePointId_fkey" FOREIGN KEY ("knowledgePointId") REFERENCES "KnowledgePoint" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Example" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "knowledgePointId" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "solution" TEXT,
    "type" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Example_knowledgePointId_fkey" FOREIGN KEY ("knowledgePointId") REFERENCES "KnowledgePoint" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KnowledgeRelation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceKnowledgePointId" TEXT NOT NULL,
    "targetKnowledgePointId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,
    "description" TEXT,
    CONSTRAINT "KnowledgeRelation_sourceKnowledgePointId_fkey" FOREIGN KEY ("sourceKnowledgePointId") REFERENCES "KnowledgePoint" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "KnowledgeRelation_targetKnowledgePointId_fkey" FOREIGN KEY ("targetKnowledgePointId") REFERENCES "KnowledgePoint" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InterviewQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "knowledgePointId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "frequency" INTEGER NOT NULL DEFAULT 3,
    "source" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InterviewQuestion_knowledgePointId_fkey" FOREIGN KEY ("knowledgePointId") REFERENCES "KnowledgePoint" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InterviewAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "interviewQuestionId" TEXT NOT NULL,
    "answerType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    CONSTRAINT "InterviewAnswer_interviewQuestionId_fkey" FOREIGN KEY ("interviewQuestionId") REFERENCES "InterviewQuestion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PracticeQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "knowledgePointId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "explanation" TEXT,
    "difficulty" INTEGER NOT NULL DEFAULT 3,
    CONSTRAINT "PracticeQuestion_knowledgePointId_fkey" FOREIGN KEY ("knowledgePointId") REFERENCES "KnowledgePoint" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudyProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "knowledgePointId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "mastery" INTEGER NOT NULL DEFAULT 0,
    "lastStudiedAt" DATETIME,
    "studyCount" INTEGER NOT NULL DEFAULT 0,
    "totalStudySeconds" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudyProgress_knowledgePointId_fkey" FOREIGN KEY ("knowledgePointId") REFERENCES "KnowledgePoint" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReviewRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "knowledgePointId" TEXT NOT NULL,
    "reviewedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "result" INTEGER NOT NULL,
    "nextReviewAt" DATETIME,
    CONSTRAINT "ReviewRecord_knowledgePointId_fkey" FOREIGN KEY ("knowledgePointId") REFERENCES "KnowledgePoint" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "knowledgePointId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Note_knowledgePointId_fkey" FOREIGN KEY ("knowledgePointId") REFERENCES "KnowledgePoint" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "knowledgePointId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Favorite_knowledgePointId_fkey" FOREIGN KEY ("knowledgePointId") REFERENCES "KnowledgePoint" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "department" TEXT,
    "major" TEXT,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "SchoolInterviewQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "year" INTEGER,
    "question" TEXT NOT NULL,
    "source" TEXT,
    "notes" TEXT,
    CONSTRAINT "SchoolInterviewQuestion_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SchoolQuestionKnowledgePoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolInterviewQuestionId" TEXT NOT NULL,
    "knowledgePointId" TEXT NOT NULL,
    "confidence" REAL,
    CONSTRAINT "SchoolQuestionKnowledgePoint_schoolInterviewQuestionId_fkey" FOREIGN KEY ("schoolInterviewQuestionId") REFERENCES "SchoolInterviewQuestion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SchoolQuestionKnowledgePoint_knowledgePointId_fkey" FOREIGN KEY ("knowledgePointId") REFERENCES "KnowledgePoint" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SubjectArea_slug_key" ON "SubjectArea"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");

-- CreateIndex
CREATE INDEX "Book_courseId_idx" ON "Book"("courseId");

-- CreateIndex
CREATE INDEX "Chapter_bookId_idx" ON "Chapter"("bookId");

-- CreateIndex
CREATE INDEX "Chapter_parentId_idx" ON "Chapter"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgePoint_slug_key" ON "KnowledgePoint"("slug");

-- CreateIndex
CREATE INDEX "KnowledgePoint_courseId_idx" ON "KnowledgePoint"("courseId");

-- CreateIndex
CREATE INDEX "KnowledgePoint_title_idx" ON "KnowledgePoint"("title");

-- CreateIndex
CREATE INDEX "ChapterKnowledgePoint_knowledgePointId_idx" ON "ChapterKnowledgePoint"("knowledgePointId");

-- CreateIndex
CREATE UNIQUE INDEX "ChapterKnowledgePoint_chapterId_knowledgePointId_key" ON "ChapterKnowledgePoint"("chapterId", "knowledgePointId");

-- CreateIndex
CREATE INDEX "Formula_knowledgePointId_idx" ON "Formula"("knowledgePointId");

-- CreateIndex
CREATE INDEX "Example_knowledgePointId_idx" ON "Example"("knowledgePointId");

-- CreateIndex
CREATE INDEX "KnowledgeRelation_targetKnowledgePointId_idx" ON "KnowledgeRelation"("targetKnowledgePointId");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeRelation_sourceKnowledgePointId_targetKnowledgePointId_relationType_key" ON "KnowledgeRelation"("sourceKnowledgePointId", "targetKnowledgePointId", "relationType");

-- CreateIndex
CREATE INDEX "InterviewQuestion_knowledgePointId_idx" ON "InterviewQuestion"("knowledgePointId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewAnswer_interviewQuestionId_answerType_key" ON "InterviewAnswer"("interviewQuestionId", "answerType");

-- CreateIndex
CREATE INDEX "PracticeQuestion_knowledgePointId_idx" ON "PracticeQuestion"("knowledgePointId");

-- CreateIndex
CREATE UNIQUE INDEX "StudyProgress_knowledgePointId_key" ON "StudyProgress"("knowledgePointId");

-- CreateIndex
CREATE INDEX "ReviewRecord_knowledgePointId_idx" ON "ReviewRecord"("knowledgePointId");

-- CreateIndex
CREATE INDEX "ReviewRecord_nextReviewAt_idx" ON "ReviewRecord"("nextReviewAt");

-- CreateIndex
CREATE INDEX "Note_knowledgePointId_idx" ON "Note"("knowledgePointId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_knowledgePointId_key" ON "Favorite"("knowledgePointId");

-- CreateIndex
CREATE INDEX "SchoolInterviewQuestion_schoolId_idx" ON "SchoolInterviewQuestion"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolQuestionKnowledgePoint_schoolInterviewQuestionId_knowledgePointId_key" ON "SchoolQuestionKnowledgePoint"("schoolInterviewQuestionId", "knowledgePointId");
