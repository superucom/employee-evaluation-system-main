import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { buildEvaluatorEvaluationWorkbook } from "@/lib/export";

const makeRecord = (overrides: Partial<any> = {}) => ({
  employee: {
    id: "employee-1",
    name: "พนักงานทดสอบ",
    nickname: "ทดสอบ",
    position: "H MC",
    department: { id: "department-1", name: "Support", code: "SUP" },
    team: { id: "team-1", name: "ทีม B", code: "TEAM_B" },
  },
  comment: "ความคิดเห็นภาพรวม",
  scores: [
    {
      scoreValue: 4,
      comment: "ข้อเสนอแนะข้อหนึ่ง",
      question: { id: "question-1", text: "การทำงานร่วมกับทีม", description: "การประสานงาน", sortOrder: 1, category: { sortOrder: 1 } },
    },
    {
      scoreValue: 5,
      comment: null,
      question: { id: "question-2", text: "การตัดสินใจ", description: null, sortOrder: 2, category: { sortOrder: 1 } },
    },
    {
      scoreValue: 4,
      comment: null,
      question: { id: "question-3", text: "ความยุติธรรม", description: null, sortOrder: 3, category: { sortOrder: 1 } },
    },
  ],
  ...overrides,
});

describe("buildEvaluatorEvaluationWorkbook", () => {
  it("creates an evaluator-centric workbook with sections and score columns", () => {
    const workbook = buildEvaluatorEvaluationWorkbook({
      evaluator: { fullName: "Sup Super" },
      period: { name: "สิงหาคม 2569" },
      records: [makeRecord()],
      teamName: "ทีม B",
    });

    expect(workbook.SheetNames).toHaveLength(1);
    expect(workbook.SheetNames[0]).toContain("Sup Super");
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: "" });
    const flattenedValues = rows.reduce<string[]>((values, row) => values.concat(row.map(String)), []);

    expect(flattenedValues).toContain("ทีม B");
    expect(flattenedValues).toContain("ผู้ประเมิน: Sup Super");
    expect(flattenedValues).toContain("แบบประเมินพนักงาน Head");
    expect(flattenedValues).toContain("พนักงานทดสอบ");
    expect(flattenedValues.some((value) => value.includes("ความคิดเห็นภาพรวม"))).toBe(true);
    expect(worksheet["E16"]?.v).toBe(4);
    expect(worksheet["F16"]?.v).toBe(5);
    expect(worksheet["G16"]?.v).toBe(4);
    expect(worksheet["!merges"]).toBeDefined();
  });

  it("keeps Head, Staff, QA, and CR records in separate sections", () => {
    const workbook = buildEvaluatorEvaluationWorkbook({
      evaluator: { fullName: "Sup Super" },
      period: { name: "สิงหาคม 2569" },
      records: [
        makeRecord(),
        makeRecord({ employee: { ...makeRecord().employee, id: "employee-2", position: "Call Center" } }),
        makeRecord({ employee: { ...makeRecord().employee, id: "employee-3", position: "QA" } }),
        makeRecord({ employee: { ...makeRecord().employee, id: "employee-4", position: "CR" } }),
      ],
    });

    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: "" });
    const sectionTitles = rows.flat().map(String).filter((value) => value.startsWith("แบบประเมินพนักงาน"));

    expect(sectionTitles).toEqual([
      "แบบประเมินพนักงาน Head",
      "แบบประเมินพนักงาน Staff",
      "แบบประเมินพนักงาน QA",
      "แบบประเมินพนักงาน CR",
    ]);
  });
});
