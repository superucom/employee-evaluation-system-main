import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { auth } from "@/lib/auth/auth";
import { formatDate, formatDateTime, getStatusClass, getStatusLabel, getMainTeamName } from "@/lib/utils";
import EvaluationActions from "./evaluation-actions";

export default async function EvaluationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const currentUser = session?.user as any;
  const { id } = await params;

  const record = await prisma.evaluationRecord.findUnique({
    where: { id },
    include: {
      employee: {
        include: {
          department: true,
          team: true,
        },
      },
      evaluatorUser: { select: { id: true, fullName: true, username: true } },
      period: true,
      scores: {
        include: {
          question: {
            include: { category: true },
          },
        },
      },
    },
  });

  if (!record) notFound();

  // Group scores by category
  const scoresByCategory: Record<string, { categoryName: string; scores: typeof record.scores }> = {};
  for (const s of record.scores) {
    const catId = s.question.category.id;
    if (!scoresByCategory[catId]) {
      scoresByCategory[catId] = {
        categoryName: s.question.category.name,
        scores: [],
      };
    }
    scoresByCategory[catId].scores.push(s);
  }

  const isManager = currentUser?.role === "MANAGER";
  const isOwner = record.evaluatorUserId === currentUser?.id;
  const isLocked = record.period.status === "LOCKED";

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/evaluations" className="hover:text-foreground">การประเมิน</Link>
        <span>/</span>
        <span className="text-foreground font-medium">ผลการประเมิน: {record.employee.name}</span>
      </div>

      {/* Header Info */}
      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">{record.employee.name}</h1>
            <span className="font-mono text-xs bg-primary/10 text-primary font-bold px-2 py-0.5 rounded">
              {record.employee.employeeCode}
            </span>
            <span className={getStatusClass(record.status)}>
              {getStatusLabel(record.status)}
            </span>
            {record.isOverride && (
              <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">
                Manager Override
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            แผนก: {record.employee.department.name}
            {record.employee.team && ` • ทีม: ${getMainTeamName(record.employee.team)}`}
            {" • "}รอบ: {record.period.name}
          </p>
        </div>

        {/* Score box */}
        <div className="flex items-center gap-3 bg-muted/40 p-4 rounded-xl border border-border">
          <div className="text-right">
            <div className="text-xs text-muted-foreground font-medium">คะแนนประเมินหัวหน้างาน</div>
            <div className="text-2xl font-bold text-primary">
              {record.supervisorScore !== null && record.supervisorScore !== undefined
                ? `${Number(record.supervisorScore).toFixed(1)} / 15`
                : "-"}
            </div>
          </div>
          <div className="text-xs text-muted-foreground border-l border-border pl-3 max-w-[130px]">
            คะแนนรวม 100 และเกรดจะคำนวณเมื่อมีคะแนนครบทุกส่วน
          </div>
        </div>
      </div>

      {/* Evaluation Metadata Box */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <span className="text-xs text-muted-foreground font-medium">ช่วงวันที่ประเมิน</span>
          <div className="font-semibold text-sm text-foreground mt-1">
            {formatDate(record.evalStartDate)} - {formatDate(record.evalEndDate)}
          </div>
          <div className="text-xs text-primary font-bold mt-0.5">ประเมิน 1 ครั้งต่อรอบ</div>
        </div>
        <div className="stat-card">
          <span className="text-xs text-muted-foreground font-medium">ผู้ประเมิน</span>
          <div className="font-semibold text-sm text-foreground mt-1">{record.evaluatorUser.fullName}</div>
          <div className="text-xs text-muted-foreground">@{record.evaluatorUser.username}</div>
        </div>
        <div className="stat-card">
          <span className="text-xs text-muted-foreground font-medium">วันที่ส่งผล</span>
          <div className="font-semibold text-sm text-foreground mt-1">
            {record.submittedAt ? formatDateTime(record.submittedAt) : "ยังไม่ได้ส่ง (ฉบับร่าง)"}
          </div>
        </div>
        <div className="stat-card">
          <span className="text-xs text-muted-foreground font-medium">สถานะรอบประเมิน</span>
          <div className="font-semibold text-sm text-foreground mt-1">
            {isLocked ? "🔒 ล็อกแล้ว (Read Only)" : "🔓 เปิดใช้งาน"}
          </div>
        </div>
      </div>

      {/* Override Notice if applicable */}
      {record.isOverride && record.overrideReason && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm space-y-1">
          <div className="font-bold flex items-center gap-2">
            <span>⚠️ รายการนี้ได้รับการแก้ไขโดยผู้จัดการ (Manager Override)</span>
          </div>
          <p className="text-xs">
            <span className="font-semibold">เหตุผลการแก้ไข: </span>
            {record.overrideReason}
          </p>
        </div>
      )}

      {/* Score breakdown by Category */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-foreground">รายละเอียดคะแนนแต่ละหัวข้อ</h2>

        {Object.entries(scoresByCategory).map(([catId, group]) => (
          <div key={catId} className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="bg-muted/40 px-6 py-3 border-b border-border">
              <h3 className="font-bold text-foreground text-sm">{group.categoryName}</h3>
            </div>
            <div className="p-6 divide-y divide-border space-y-4">
              {group.scores.map((s, index) => (
                <div key={s.id} className={index > 0 ? "pt-4" : ""}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-medium text-sm text-foreground">{s.question.text}</div>
                      {s.comment && (
                        <p className="text-xs text-muted-foreground mt-1 bg-muted/30 p-2 rounded">
                          หมายเหตุ: {s.comment}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center text-sm border border-primary/20">
                        {s.scoreValue}
                      </span>
                      <span className="text-xs text-muted-foreground">/ 5</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Overall Comment */}
      {record.comment && (
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-2">
          <h2 className="text-sm font-bold text-foreground">ความคิดเห็นโดยรวมของผู้ประเมิน</h2>
          <p className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-xl">
            {record.comment}
          </p>
        </div>
      )}

      {/* Actions (Manager Override / Edit / Delete) */}
      <EvaluationActions
        recordId={record.id}
        isManager={isManager}
        isOwner={isOwner}
        isLocked={isLocked}
        status={record.status}
        initialComment={record.comment || ""}
        scores={record.scores.map((s) => ({
          questionId: s.questionId,
          questionText: s.question.text,
          scoreValue: s.scoreValue,
          comment: s.comment || "",
        }))}
      />
    </div>
  );
}
