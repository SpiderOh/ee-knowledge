import { KnowledgeCategory } from "@prisma/client";
import { z } from "zod";

const slug = z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug 只能使用小写英文、数字和连字符。");
const optionalSource = z.preprocess((value) => typeof value === "string" && value.trim() === "" ? undefined : value, z.string().trim().max(500).optional());

export const materialDraftSchema = z.object({
  courseSlug: slug,
  title: z.string().trim().min(1, "标题不能为空。").max(200, "标题不能超过 200 个字符。"),
  slug,
  category: z.nativeEnum(KnowledgeCategory),
  source: z.string().trim().min(1, "来源名称不能为空。").max(500, "来源名称不能超过 500 个字符。"),
  sourceBook: optionalSource,
  sourceChapter: optionalSource,
  sourcePage: optionalSource,
  content: z.string().trim().min(1, "正文不能为空。").max(50000, "当前单个 KnowledgePoint 正文最多 50,000 字符，请先删减或拆分资料后再导入。"),
});
export type MaterialDraft = z.infer<typeof materialDraftSchema>;
