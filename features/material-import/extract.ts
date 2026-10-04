export const MAX_TEXT_MATERIAL_BYTES = 2 * 1024 * 1024;
export const MAX_DOCUMENT_MATERIAL_BYTES = 10 * 1024 * 1024;
// Kept as a compatibility alias for the existing text import UI and callers.
export const MAX_MATERIAL_BYTES = MAX_TEXT_MATERIAL_BYTES;

export type TextMaterialFormat = "markdown" | "text" | "pdf" | "docx";
export type ExtractedMaterial = {
  originalFileName: string;
  format: TextMaterialFormat;
  mimeType: string | null;
  byteSize: number;
  text: string;
  pageCount?: number;
  warnings?: string[];
};
export type ExtractTextMaterialInput = { fileName: string; mimeType?: string | null; bytes: Uint8Array };

export function safeMaterialFileName(fileName: string) {
  const baseName = fileName.replace(/\\/g, "/").split("/").pop() ?? "material.txt";
  const cleaned = baseName.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 200);
  return cleaned || "material.txt";
}

export function materialFileExtension(fileName: string) {
  const safeName = safeMaterialFileName(fileName).toLowerCase();
  const dot = safeName.lastIndexOf(".");
  return dot >= 0 ? safeName.slice(dot) : "";
}

export function isTextMaterialExtension(fileName: string) {
  const extension = materialFileExtension(fileName);
  return extension === ".md" || extension === ".markdown" || extension === ".txt";
}

export function isDocumentMaterialExtension(fileName: string) {
  const extension = materialFileExtension(fileName);
  return extension === ".pdf" || extension === ".docx";
}

export function suggestMaterialTitle(fileName: string) {
  return safeMaterialFileName(fileName).replace(/\.(markdown|md|txt|pdf|docx)$/i, "").trim();
}

export function suggestMaterialSlug(fileName: string) {
  const title = suggestMaterialTitle(fileName).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(title) ? title : "";
}

export function extractTextMaterial({ fileName, mimeType = null, bytes }: ExtractTextMaterialInput): ExtractedMaterial {
  const extension = materialFileExtension(fileName);
  if (!bytes.byteLength) throw new Error("文件没有可导入的文本内容。");
  if (bytes.byteLength > MAX_TEXT_MATERIAL_BYTES) throw new Error("Markdown / TXT 文件不能超过 2 MB。");
  if (bytes.includes(0)) throw new Error("文件包含二进制内容，无法按文本导入。");
  if (!isTextMaterialExtension(fileName)) throw new Error("仅支持 Markdown / TXT 文件。");
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("当前仅支持 UTF-8 编码的 Markdown / TXT 文件。");
  }
  text = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
  if (!text) throw new Error("文件没有可导入的文本内容。");
  return { originalFileName: safeMaterialFileName(fileName), format: extension === ".txt" ? "text" : "markdown", mimeType, byteSize: bytes.byteLength, text };
}
