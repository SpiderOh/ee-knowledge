"use server";

import { revalidatePath } from "next/cache";
import { extractTextMaterial } from "./extract";
import { importMaterialDraft, previewMaterialDraft } from "./service";

export async function extractMaterialAction(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false as const, errors: ["请选择 Markdown 或 TXT 文件。"] };
  try {
    const extracted = extractTextMaterial({ fileName: file.name, mimeType: file.type || null, bytes: new Uint8Array(await file.arrayBuffer()) });
    return { ok: true as const, extracted };
  } catch (error) { return { ok: false as const, errors: [error instanceof Error ? error.message : "文件读取失败。"] }; }
}
export async function previewMaterialAction(input: unknown) { return previewMaterialDraft(input); }
export async function importMaterialAction(input: unknown, expectedSnapshot: string) {
  const result = await importMaterialDraft(input, expectedSnapshot);
  if (result.ok) { revalidatePath("/admin"); revalidatePath("/admin/knowledge"); revalidatePath("/courses"); revalidatePath("/knowledge/" + result.created.slug); revalidatePath("/search"); }
  return result;
}
