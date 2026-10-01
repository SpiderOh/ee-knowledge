-- CreateTable
CREATE TABLE "PracticeQuestionOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "practiceQuestionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PracticeQuestionOption_practiceQuestionId_fkey" FOREIGN KEY ("practiceQuestionId") REFERENCES "PracticeQuestion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PracticeAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "practiceQuestionId" TEXT NOT NULL,
    "submittedAnswer" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "attemptedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PracticeAttempt_practiceQuestionId_fkey" FOREIGN KEY ("practiceQuestionId") REFERENCES "PracticeQuestion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PracticeQuestionOption_practiceQuestionId_key_key" ON "PracticeQuestionOption"("practiceQuestionId", "key");

-- CreateIndex
CREATE INDEX "PracticeQuestionOption_practiceQuestionId_idx" ON "PracticeQuestionOption"("practiceQuestionId");

-- CreateIndex
CREATE INDEX "PracticeAttempt_practiceQuestionId_attemptedAt_idx" ON "PracticeAttempt"("practiceQuestionId", "attemptedAt");

-- CreateIndex
CREATE INDEX "PracticeAttempt_isCorrect_attemptedAt_idx" ON "PracticeAttempt"("isCorrect", "attemptedAt");
