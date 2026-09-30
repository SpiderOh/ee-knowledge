"use server";

import { revalidatePath } from "next/cache";
import { importKnowledgeBundle, previewKnowledgeBundle } from "./service";

export async function previewKnowledgeBundleAction(input: string) { return previewKnowledgeBundle(input); }

export async function importKnowledgeBundleAction(input: string) { const result = await importKnowledgeBundle(input); if (result.ok) { revalidatePath("/admin"); revalidatePath("/admin/knowledge"); revalidatePath("/courses"); revalidatePath("/search"); } return result; }
