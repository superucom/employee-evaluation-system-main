const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Current Users
  console.log('\n=== CURRENT USERS ===');
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    include: { department: true, team: true },
    orderBy: [{ role: 'asc' }, { username: 'asc' }]
  });
  console.table(users.map(u => ({
    username: u.username,
    fullName: u.fullName,
    role: u.role,
    dept: u.department?.code || '-',
    team: u.team?.code || '-',
    isActive: u.isActive
  })));

  // 2. Evaluation Criteria
  console.log('\n=== EVALUATION CRITERIA ===');
  const criteria = await prisma.evaluationCriteria.findMany({
    include: { questions: true }
  });
  console.table(criteria.map(c => ({
    id: c.id,
    name: c.name,
    description: c.description?.substring(0, 50),
    isActive: c.isActive,
    questionCount: c.questions.length
  })));

  // 3. Active Evaluation Periods
  console.log('\n=== EVALUATION PERIODS ===');
  const periods = await prisma.evaluationPeriod.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.table(periods.map(p => ({
    id: p.id,
    name: p.name,
    status: p.status,
    type: p.type,
    startDate: p.startDate,
    endDate: p.endDate
  })));

  // 4. Existing Evaluator Assignments
  console.log('\n=== EXISTING EVALUATOR ASSIGNMENTS ===');
  const assignments = await prisma.evaluatorAssignment.findMany({
    include: {
      evaluatorUser: true,
      targetDepartment: true,
      targetTeam: true,
      targetEmployee: true
    },
    take: 30
  });
  console.table(assignments.map(a => ({
    evaluator: a.evaluatorUser.username,
    type: a.assignmentType,
    targetDept: a.targetDepartment?.code || '-',
    targetTeam: a.targetTeam?.code || '-',
    targetEmp: a.targetEmployee?.name || '-',
    criteriaId: a.criteriaId
  })));

  // 5. Departments with employee breakdown
  console.log('\n=== DEPARTMENTS SUMMARY ===');
  const depts = await prisma.department.findMany({
    where: { deletedAt: null },
    include: {
      teams: {
        where: { deletedAt: null },
        orderBy: { code: 'asc' }
      },
      _count: { select: { employees: { where: { deletedAt: null } } } }
    },
    orderBy: { code: 'asc' }
  });
  depts.forEach(d => {
    console.log(`Dept: ${d.code} (${d.id}) - ${d._count.employees} employees`);
    d.teams.forEach(t => console.log(`  Team: ${t.code} (${t.id})`));
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
