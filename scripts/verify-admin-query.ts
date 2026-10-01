import { parseAdminKnowledgeQueryParams } from "@/features/content-management/schemas";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const emptyStatus = parseAdminKnowledgeQueryParams({ q: "基尔霍夫", reviewStatus: "" });
assert(emptyStatus.q === "基尔霍夫" && emptyStatus.reviewStatus === undefined, "空 reviewStatus 应保留 q 并归一化为 undefined");

const emptyStatusWithCourse = parseAdminKnowledgeQueryParams({ q: "基尔霍夫", course: "circuit-theory", reviewStatus: "" });
assert(emptyStatusWithCourse.q === "基尔霍夫" && emptyStatusWithCourse.course === "circuit-theory" && emptyStatusWithCourse.reviewStatus === undefined, "空 reviewStatus 不应清除 q/course");

const invalidStatus = parseAdminKnowledgeQueryParams({ q: "基尔霍夫", reviewStatus: "INVALID" });
assert(invalidStatus.q === "基尔霍夫" && invalidStatus.reviewStatus === undefined, "非法 reviewStatus 不应清除合法 q");

const invalidPage = parseAdminKnowledgeQueryParams({ q: "基尔霍夫", page: "not-a-page" });
assert(invalidPage.q === "基尔霍夫" && invalidPage.page === 1, "非法 page 应回退到第 1 页并保留 q");

console.log("Admin query verification passed", { emptyStatus, emptyStatusWithCourse, invalidStatus, invalidPage });
