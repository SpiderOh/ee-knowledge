import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import {
  MAX_DOCUMENT_MATERIAL_BYTES,
  extractTextMaterial,
  isDocumentMaterialExtension,
  isTextMaterialExtension,
  materialFileExtension,
  safeMaterialFileName,
  type ExtractedMaterial,
  type ExtractTextMaterialInput,
} from "./extract";

function normalizeExtractedText(text: string) {
  return text.replace(/\r\n?/g, "\n").trim();
}

function ensureDocumentSize(bytes: Uint8Array) {
  if (!bytes.byteLength) throw new Error("文件没有可导入的文本内容。");
  if (bytes.byteLength > MAX_DOCUMENT_MATERIAL_BYTES) throw new Error("PDF / DOCX 文件不能超过 10 MB。");
}

async function extractPdf({ fileName, mimeType = null, bytes }: ExtractTextMaterialInput): Promise<ExtractedMaterial> {
  ensureDocumentSize(bytes);
  const parser = new PDFParse({ data: bytes });
  try {
    const result = await parser.getText();
    const text = normalizeExtractedText(result.text.replace(/\n-- \d+ of \d+ --/g, ""));
    if (!text) throw new Error("没有检测到可提取的 PDF 文本。该文件可能是扫描版 PDF；当前不支持 OCR。");
    return {
      originalFileName: safeMaterialFileName(fileName),
      format: "pdf",
      mimeType,
      byteSize: bytes.byteLength,
      text,
      pageCount: result.total > 0 ? result.total : undefined,
    };
  } catch (error) {
    if (error instanceof Error && (error.message.includes("没有检测到可提取") || /password|密码/i.test(error.message))) {
      if (/password|密码/i.test(error.message) && !error.message.includes("没有检测到")) {
        throw new Error("当前不支持需要密码的 PDF，请先移除密码后再导入。");
      }
      throw error;
    }
    throw new Error("PDF 无法解析或文件已损坏。");
  } finally {
    await parser.destroy();
  }
}

async function extractDocx({ fileName, mimeType = null, bytes }: ExtractTextMaterialInput): Promise<ExtractedMaterial> {
  ensureDocumentSize(bytes);
  try {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    const text = normalizeExtractedText(result.value);
    if (!text) throw new Error("DOCX 没有可提取的文本内容。");
    const warnings = result.messages.map((message) => message.message).filter(Boolean);
    return {
      originalFileName: safeMaterialFileName(fileName),
      format: "docx",
      mimeType,
      byteSize: bytes.byteLength,
      text,
      ...(warnings.length ? { warnings } : {}),
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("没有可提取")) throw error;
    throw new Error("DOCX 无法解析或文件已损坏。");
  }
}

export async function extractMaterial(input: ExtractTextMaterialInput): Promise<ExtractedMaterial> {
  const extension = materialFileExtension(input.fileName);
  if (isTextMaterialExtension(input.fileName)) return extractTextMaterial(input);
  if (extension === ".doc") throw new Error("当前只支持 DOCX，不支持旧版 .doc 文件。");
  if (extension === ".pdf") return extractPdf(input);
  if (extension === ".docx") return extractDocx(input);
  if (!isDocumentMaterialExtension(input.fileName)) throw new Error("当前仅支持 Markdown、TXT、PDF 和 DOCX 文件。");
  throw new Error("文件无法识别。");
}
