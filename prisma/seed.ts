import { PrismaClient, Role, PeriodStatus, AssignmentType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // ============================================================
  // 1. Departments
  // ============================================================
  const departments = await Promise.all([
    prisma.department.upsert({
      where: { code: "SALES" },
      update: {},
      create: { name: "Sales", code: "SALES", description: "แผนกขาย" },
    }),
    prisma.department.upsert({
      where: { code: "SUPPORT" },
      update: {},
      create: { name: "Support", code: "SUPPORT", description: "แผนก Support" },
    }),
    prisma.department.upsert({
      where: { code: "OPERATION" },
      update: {},
      create: { name: "Operation", code: "OPERATION", description: "แผนกปฏิบัติการ" },
    }),
    prisma.department.upsert({
      where: { code: "HR" },
      update: {},
      create: { name: "HR", code: "HR", description: "แผนกทรัพยากรบุคคล" },
    }),
  ]);

  console.log(`✅ Created ${departments.length} departments`);

  // ============================================================
  // 2. Teams (linked to Support department)
  // ============================================================
  const supportDept = departments.find((d) => d.code === "SUPPORT")!;
  const salesDept = departments.find((d) => d.code === "SALES")!;

  const teams = await Promise.all([
    prisma.team.upsert({
      where: { code: "TEAM_A" },
      update: {},
      create: { departmentId: supportDept.id, name: "Team A", code: "TEAM_A" },
    }),
    prisma.team.upsert({
      where: { code: "TEAM_B" },
      update: {},
      create: { departmentId: supportDept.id, name: "Team B", code: "TEAM_B" },
    }),
    prisma.team.upsert({
      where: { code: "TEAM_C" },
      update: {},
      create: { departmentId: supportDept.id, name: "Team C", code: "TEAM_C" },
    }),
  ]);

  console.log(`✅ Created ${teams.length} teams`);

  // ============================================================
  // 3. Users
  // ============================================================
  const passwordHash = await bcrypt.hash("ChangeMe123!", 12);

  const manager = await prisma.user.upsert({
    where: { username: "manager" },
    update: {},
    create: {
      username: "manager",
      passwordHash,
      fullName: "ผู้จัดการระบบ",
      role: Role.MANAGER,
      mustChangePassword: true,
    },
  });

  const teamA = teams.find((t) => t.code === "TEAM_A")!;
  const teamB = teams.find((t) => t.code === "TEAM_B")!;

  const evaluators = await Promise.all([
    prisma.user.upsert({
      where: { username: "super01" },
      update: { role: Role.SUPER, departmentId: supportDept.id, isActive: true },
      create: {
        username: "super01",
        passwordHash,
        fullName: "Super 01",
        role: Role.SUPER,
        departmentId: supportDept.id,
        mustChangePassword: true,
      },
    }),
    prisma.user.upsert({
      where: { username: "supportsupervising01" },
      update: { role: Role.SUPPORT_SUPER, departmentId: supportDept.id, isActive: true },
      create: {
        username: "supportsupervising01",
        passwordHash,
        fullName: "Support Super 01",
        role: Role.SUPPORT_SUPER,
        departmentId: supportDept.id,
        mustChangePassword: true,
      },
    }),
    prisma.user.upsert({
      where: { username: "head01" },
      update: { role: Role.HEAD, departmentId: supportDept.id, isActive: true },
      create: {
        username: "head01",
        passwordHash,
        fullName: "Head 01",
        role: Role.HEAD,
        departmentId: supportDept.id,
        mustChangePassword: true,
      },
    }),
    prisma.user.upsert({
      where: { username: "supporthead01" },
      update: { role: Role.SUPPORT_HEAD, departmentId: supportDept.id, isActive: true },
      create: {
        username: "supporthead01",
        passwordHash,
        fullName: "Support Head 01",
        role: Role.SUPPORT_HEAD,
        departmentId: supportDept.id,
        mustChangePassword: true,
      },
    }),
  ]);

  console.log(`✅ Created ${evaluators.length + 1} users (1 manager + ${evaluators.length} evaluators)`);

  // ============================================================
  // 4. Employees (10+ employees)
  // ============================================================
  const employeeData = [
    { employeeCode: "EMP001", name: "สมชาย ใจดี", nickname: "ชาย", departmentId: supportDept.id, teamId: teamA.id, position: "Support Agent" },
    { employeeCode: "EMP002", name: "สมหญิง รักงาน", nickname: "หญิง", departmentId: supportDept.id, teamId: teamA.id, position: "Support Agent" },
    { employeeCode: "EMP003", name: "วิชัย ขยันทำ", nickname: "ชาย", departmentId: supportDept.id, teamId: teamA.id, position: "Support Senior" },
    { employeeCode: "EMP004", name: "มาลี แสนดี", nickname: "มาลี", departmentId: supportDept.id, teamId: teamB.id, position: "Support Agent" },
    { employeeCode: "EMP005", name: "ประสิทธิ์ เก่งกาจ", nickname: "ต้น", departmentId: supportDept.id, teamId: teamB.id, position: "Support Agent" },
    { employeeCode: "EMP006", name: "วรรณา ทำงานดี", nickname: "แนน", departmentId: supportDept.id, teamId: teamB.id, position: "Support Specialist" },
    { employeeCode: "EMP007", name: "อภิชาต สุขสม", nickname: "แชป", departmentId: salesDept.id, teamId: null, position: "Sales Executive" },
    { employeeCode: "EMP008", name: "นิดา ขยันขัน", nickname: "นิด", departmentId: salesDept.id, teamId: null, position: "Sales Executive" },
    { employeeCode: "EMP009", name: "พงษ์ศักดิ์ เฉลียว", nickname: "ต๊อก", departmentId: salesDept.id, teamId: null, position: "Sales Manager" },
    { employeeCode: "EMP010", name: "กมลา ใสใจ", nickname: "แก้ม", departmentId: supportDept.id, teamId: teamA.id, position: "Support Agent" },
    { employeeCode: "EMP011", name: "ธีรพงษ์ ดีงาม", nickname: "เป้", departmentId: supportDept.id, teamId: teamB.id, position: "Support Agent" },
    { employeeCode: "EMP012", name: "ศิริพร มั่นคง", nickname: "ปิ๊ก", departmentId: supportDept.id, teamId: teamA.id, position: "Support Senior" },
  ];

  const employees = await Promise.all(
    employeeData.map((emp) =>
      prisma.employee.upsert({
        where: { employeeCode: emp.employeeCode },
        update: {},
        create: { ...emp, startDate: new Date("2024-01-01") },
      })
    )
  );

  console.log(`✅ Created ${employees.length} employees`);

  // ============================================================
  // 5. Score Scale (1-5)
  // ============================================================
  const scaleExists = await prisma.scoreScale.findFirst({ where: { isDefault: true } });

  let scale;
  if (!scaleExists) {
    scale = await prisma.scoreScale.create({
      data: {
        name: "มาตรวัด 1-5",
        minScore: 1,
        maxScore: 5,
        isDefault: true,
        labels: {
          create: [
            { scoreValue: 1, label: "ต้องปรับปรุงมาก", description: "ผลงานต่ำกว่ามาตรฐานมาก" },
            { scoreValue: 2, label: "ต้องปรับปรุง", description: "ผลงานต่ำกว่ามาตรฐาน" },
            { scoreValue: 3, label: "ผ่านมาตรฐาน", description: "ผลงานอยู่ในระดับมาตรฐาน" },
            { scoreValue: 4, label: "ดี", description: "ผลงานสูงกว่ามาตรฐาน" },
            { scoreValue: 5, label: "ดีมาก", description: "ผลงานดีเยี่ยม" },
          ],
        },
      },
    });
    console.log("✅ Created default score scale (1-5)");
  } else {
    scale = scaleExists;
    console.log("ℹ️ Score scale already exists");
  }

  // ============================================================
  // 6. Grade Configuration
  // ============================================================
  const gradesExist = await prisma.gradeConfig.count();

  if (gradesExist === 0) {
    await prisma.gradeConfig.createMany({
      data: [
        { name: "เกรด A+", label: "A+", minPercentage: 95, maxPercentage: 100, sortOrder: 1 },
        { name: "เกรด A", label: "A", minPercentage: 90, maxPercentage: 94.99, sortOrder: 2 },
        { name: "เกรด B", label: "B", minPercentage: 80, maxPercentage: 89.99, sortOrder: 3 },
        { name: "เกรด C", label: "C", minPercentage: 70, maxPercentage: 79.99, sortOrder: 4 },
        { name: "เกรด D", label: "D", minPercentage: 60, maxPercentage: 69.99, sortOrder: 5 },
        { name: "ไม่ผ่านเกณฑ์", label: "F", minPercentage: 0, maxPercentage: 59.99, sortOrder: 6 },
      ],
    });
    console.log("✅ Created grade configs (A-F)");
  }

  // Keep grade thresholds aligned with the 100-point checklist, even when
  // the database already contains an older set of grade rows.
  const canonicalGrades = [
    { name: "เกรด A+", label: "A+", minPercentage: 95, maxPercentage: 100, sortOrder: 1 },
    { name: "เกรด A", label: "A", minPercentage: 90, maxPercentage: 94.99, sortOrder: 2 },
    { name: "เกรด B", label: "B", minPercentage: 80, maxPercentage: 89.99, sortOrder: 3 },
    { name: "เกรด C", label: "C", minPercentage: 70, maxPercentage: 79.99, sortOrder: 4 },
    { name: "เกรด D", label: "D", minPercentage: 60, maxPercentage: 69.99, sortOrder: 5 },
    { name: "ไม่ผ่านเกณฑ์", label: "F", minPercentage: 0, maxPercentage: 59.99, sortOrder: 6 },
  ];
  for (const grade of canonicalGrades) {
    const existing = await prisma.gradeConfig.findFirst({ where: { label: grade.label }, orderBy: { sortOrder: "asc" } });
    if (existing) {
      await prisma.gradeConfig.update({ where: { id: existing.id }, data: grade });
      await prisma.gradeConfig.updateMany({ where: { label: grade.label, id: { not: existing.id } }, data: { isActive: false } });
    } else {
      await prisma.gradeConfig.create({ data: grade });
    }
  }
  await prisma.gradeConfig.updateMany({
    where: { isActive: true, label: { notIn: canonicalGrades.map((grade) => grade.label) } },
    data: { isActive: false },
  });

  // ============================================================
  // 7. Evaluation Categories & Questions
  // ============================================================
  const categoriesExist = await prisma.evaluationCategory.count();

  if (categoriesExist === 0) {
    const categoryData = [
      {
        name: "การมาปฏิบัติงาน",
        description: "ความตรงต่อเวลาและการมาทำงาน",
        sortOrder: 1,
        questions: [
          { text: "ตรงต่อเวลา", sortOrder: 1 },
          { text: "ไม่ขาดงานโดยไม่มีเหตุผล", sortOrder: 2 },
          { text: "การแจ้งลาล่วงหน้า", sortOrder: 3 },
        ],
      },
      {
        name: "คุณภาพงาน",
        description: "ความถูกต้องและคุณภาพของงาน",
        sortOrder: 2,
        questions: [
          { text: "คุณภาพของงานที่ส่งมอบ", sortOrder: 1 },
          { text: "ความถูกต้องและความละเอียดรอบคอบ", sortOrder: 2 },
          { text: "การปฏิบัติตามขั้นตอนและมาตรฐาน", sortOrder: 3 },
        ],
      },
      {
        name: "ประสิทธิภาพการทำงาน",
        description: "ปริมาณและความเร็วของงาน",
        sortOrder: 3,
        questions: [
          { text: "ปริมาณงานที่ทำได้", sortOrder: 1 },
          { text: "ความรวดเร็วในการทำงาน", sortOrder: 2 },
          { text: "การทำงานให้เสร็จตามเป้าหมาย", sortOrder: 3 },
        ],
      },
      {
        name: "การทำงานเป็นทีม",
        description: "ความร่วมมือและการสื่อสาร",
        sortOrder: 4,
        questions: [
          { text: "การให้ความร่วมมือกับเพื่อนร่วมงาน", sortOrder: 1 },
          { text: "การสื่อสารอย่างมีประสิทธิภาพ", sortOrder: 2 },
          { text: "การช่วยเหลือสมาชิกในทีม", sortOrder: 3 },
        ],
      },
    ];

    for (const cat of categoryData) {
      const { questions, ...catData } = cat;
      const category = await prisma.evaluationCategory.create({
        data: {
          ...catData,
          questions: {
            create: questions,
          },
        },
      });
    }

    console.log(`✅ Created ${categoryData.length} evaluation categories with questions`);
  }

  // The supervisor section is a fixed 15-point assessment: 3 questions × 5 points.
  const supervisorCategory = await prisma.evaluationCategory.findFirst({
    where: { name: "การประเมินจากหัวหน้างาน (15 คะแนน)" },
  });
  if (!supervisorCategory) {
    await prisma.evaluationCategory.create({
      data: {
        name: "การประเมินจากหัวหน้างาน (15 คะแนน)",
        description: "คะแนนประเมินหัวหน้างาน ใช้ 3 หัวข้อ หัวข้อละ 5 คะแนน",
        sortOrder: 0,
        questions: {
          create: [
            { text: "การทำงานร่วมกับทีม/การประสานงาน", sortOrder: 1 },
            { text: "ความรับผิดชอบต่อหน้างาน", sortOrder: 2 },
            { text: "ความรู้ความสามารถเกี่ยวกับหน้างาน", sortOrder: 3 },
          ],
        },
      },
    });
    console.log("✅ Created supervisor assessment category (15 points)");
  }

  // ============================================================
  // 8. Evaluation Period (August 2026)
  // ============================================================
  const periodExists = await prisma.evaluationPeriod.findFirst({
    where: { name: "สิงหาคม 2026" },
  });

  let period;
  if (!periodExists) {
    period = await prisma.evaluationPeriod.create({
      data: {
        name: "สิงหาคม 2026",
        startDate: new Date("2026-08-01"),
        endDate: new Date("2026-08-31"),
        expectedWorkingDays: 1,
        status: PeriodStatus.ACTIVE,
      },
    });
    console.log("✅ Created evaluation period: สิงหาคม 2026");
  } else {
    period = periodExists;
    console.log("ℹ️ Period already exists");
  }

  // ============================================================
  // 9. Evaluator Assignments with Weights
  // ============================================================
  const [super01, supportSuper01, head01, supportHead01] = evaluators;

  const assignmentsExist = await prisma.evaluatorAssignment.count();

  if (assignmentsExist === 0) {
    // Assign evaluators to Team A employees
    const teamAEmployees = employees.filter((e) => e.teamId === teamA.id);

    for (const emp of teamAEmployees) {
      await prisma.evaluatorAssignment.createMany({
        data: [
          { evaluatorUserId: super01.id, assignmentType: AssignmentType.EMPLOYEE, targetEmployeeId: emp.id, periodId: period.id, weightPercentage: 40 },
          { evaluatorUserId: supportSuper01.id, assignmentType: AssignmentType.EMPLOYEE, targetEmployeeId: emp.id, periodId: period.id, weightPercentage: 20 },
          { evaluatorUserId: head01.id, assignmentType: AssignmentType.EMPLOYEE, targetEmployeeId: emp.id, periodId: period.id, weightPercentage: 30 },
          { evaluatorUserId: supportHead01.id, assignmentType: AssignmentType.EMPLOYEE, targetEmployeeId: emp.id, periodId: period.id, weightPercentage: 10 },
        ],
      });
    }

    // Assign super01 to Team B by team
    await prisma.evaluatorAssignment.create({
      data: {
        evaluatorUserId: super01.id,
        assignmentType: AssignmentType.TEAM,
        targetTeamId: teamB.id,
        periodId: period.id,
        weightPercentage: 60,
      },
    });

    await prisma.evaluatorAssignment.create({
      data: {
        evaluatorUserId: supportSuper01.id,
        assignmentType: AssignmentType.TEAM,
        targetTeamId: teamB.id,
        periodId: period.id,
        weightPercentage: 40,
      },
    });

    console.log("✅ Created evaluator assignments");
  }

  console.log("\n🎉 Seed completed successfully!");
  console.log("\n📋 Login credentials (all require password change on first login):");
  console.log("   Manager:  username=manager        password=ChangeMe123!");
  console.log("   Evaluator: username=super01        password=ChangeMe123!");
  console.log("   Evaluator: username=head01         password=ChangeMe123!");
  console.log("\n⚠️  IMPORTANT: Change all passwords immediately in production!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
