-- Add additive KnowledgePoint learning content fields.
ALTER TABLE "KnowledgePoint" ADD COLUMN "commonMistakes" TEXT;
ALTER TABLE "KnowledgePoint" ADD COLUMN "masteryCriteria" TEXT;
