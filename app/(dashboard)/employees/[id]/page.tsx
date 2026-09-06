import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { formatDate, formatDateTime, formatScore, formatPercent, getMainTeamName } from "@/lib/utils";

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const employee = await prisma.employee.findFirst({
    where: { id, deletedAt: null },
    include: {
      department: true,
      team: true,
      evaluationRecords: {
        orderBy: { evalStartDate: "desc" },
        include: {
          evaluatorUser: { select: { fullName: true, username: true } },
          period: { select: { id: true, name: true, expectedWorkingDays: true } },
          scores: {
            include: {
              question: { select: { text: true, category: { select: { name: true } } } },
            },
          },
        },
      },
    },
  });

  if (!employee) notFound();

  // Calculate statistics
  const submittedEvaluations = employee.evaluationRecords.filter((e) => e.status === "SUBMITTED");
  const totalEvaluations = employee.evaluationRecords.length;

  const avgScore =
    submittedEvaluations.length > 0 && submittedEvaluations.every((e) => e.totalScore !== null)
      ? submittedEvaluations.reduce((sum, e) => sum + Number(e.totalScore || 0), 0) / submittedEvaluations.length
      : null;

  const latestEvaluation = submittedEvaluations[0];

  return (
    <div className="space-y-6">
      {/* Breadcrumb / Back button */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/employees" className="hover:text-foreground">
          พนักงาน
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{employee.name}</span>
      </div>

      {/* Header Info */}
      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary font-bold text-2xl flex items-center justify-center border border-primary/20">
            {employee.nickname ? employee.nickname.charAt(0) : employee.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{employee.name}</h1>
              {employee.nickname && (
                <span className="text-sm bg-muted px-2 py-0.5 rounded text-muted-foreground">
                  ({employee.nickname})
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              รหัส: <span className="font-mono font-semibold text-primary">{employee.employeeCode}</span>
              {" • "}แผนก: {employee.department?.name || "-"}
              {employee.team && ` • ทีม: ${getMainTeamName(employee.team)}`}
              {employee.position && ` • ตำแหน่ง: ${employee.position}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/evaluations/new?employeeId=${employee.id}`}
            className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg text-sm hover:bg-primary/90 transition-colors shadow-sm"
          >
            + ประเมินพนักงานคนนี้
          </Link>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="text-xs text-muted-foreground font-medium">คะแนนเฉลี่ยรวม</div>
          <div className="text-3xl font-bold text-primary mt-1">{avgScore === null ? "-" : `${avgScore.toFixed(1)} / 100`}</div>
          <div className="text-xs text-muted-foreground mt-1">จาก {submittedEvaluations.length} การประเมิน</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-muted-foreground font-medium">เกรดล่าสุด</div>
          <div className="text-3xl font-bold text-blue-600 mt-1">
            {latestEvaluation?.grade || "-"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {latestEvaluation?.totalScore !== null && latestEvaluation?.totalScore !== undefined
              ? `${Number(latestEvaluation.totalScore).toFixed(1)} / 100`
              : "รอคะแนนส่วนอื่น"}
          </div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-muted-foreground font-medium">ประเมินแล้ว</div>
          <div className="text-3xl font-bold text-green-600 mt-1">{submittedEvaluations.length}</div>
          <div className="text-xs text-muted-foreground mt-1">ทั้งหมด {totalEvaluations} รายการ</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-muted-foreground font-medium">วันที่เริ่มงาน</div>
          <div className="text-lg font-bold text-foreground mt-2">{formatDate(employee.startDate)}</div>
          <div className="text-xs text-muted-foreground mt-1">
            สถานะ: {employee.status === "active" ? "ทำงานอยู่" : "Inactive"}
          </div>
        </div>
      </div>

      {/* Evaluation Timeline */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
        <h2 className="text-lg font-bold text-foreground mb-4">ประวัติการประเมิน (Evaluation Timeline)</h2>

        {employee.evaluationRecords.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            ยังไม่มีประวัติการประเมินสำหรับพนักงานคนนี้
          </div>
        ) : (
          <div className="space-y-4">
            {employee.evaluationRecords.map((record) => (
              <div
                key={record.id}
                className="p-4 rounded-xl border border-border hover:border-primary/30 transition-colors bg-muted/20"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {formatDate(record.evalStartDate)} - {formatDate(record.evalEndDate)}
                      </span>
                      <span className="text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded">
                        ประเมิน 1 ครั้ง
                      </span>
                      <span className={record.status === "SUBMITTED" ? "badge-submitted" : "badge-draft"}>
                        {record.status === "SUBMITTED" ? "ส่งแล้ว" : "ฉบับร่าง"}
                      </span>
                      {record.isOverride && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-medium">
                          Manager Override
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      รอบ: {record.period.name} • ผู้ประเมิน: {record.evaluatorUser.fullName}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xl font-bold text-primary">
                        {record.supervisorScore !== null && record.supervisorScore !== undefined
                          ? `${Number(record.supervisorScore).toFixed(1)} / 15`
                          : "-"}
                      </div>
                      <div className="text-xs font-bold text-muted-foreground">คะแนนประเมินหัวหน้างาน</div>
                    </div>
                    <Link
                      href={`/evaluations/${record.id}`}
                      className="px-3 py-1.5 text-xs font-medium bg-background border border-input hover:bg-muted rounded-lg"
                    >
                      ดูรายละเอียด
                    </Link>
                  </div>
                </div>

                {/* Comment & override reason */}
                {record.comment && (
                  <div className="text-xs text-muted-foreground bg-background p-2.5 rounded-lg border mb-2">
                    <span className="font-semibold text-foreground">ความคิดเห็น: </span>
                    {record.comment}
                  </div>
                )}

                {record.isOverride && record.overrideReason && (
                  <div className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                    <span className="font-semibold">เหตุผลการ Override: </span>
                    {record.overrideReason}
                  </div>
                )}

                {/* Score breakdown preview */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                  {record.scores.slice(0, 4).map((s) => (
                    <div key={s.id} className="text-xs bg-background p-2 rounded border">
                      <div className="text-muted-foreground truncate">{s.question.text}</div>
                      <div className="font-bold text-foreground mt-0.5">คะแนน: {s.scoreValue}/5</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
