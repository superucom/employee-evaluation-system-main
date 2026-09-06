const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Evaluation Categories (หัวข้อประเมิน)
  console.log('\n=== EVALUATION CATEGORIES ===');
  const categories = await prisma.evaluationCategory.findMany({
    include: { questions: { where: { isActive: true } } },
    orderBy: { sortOrder: 'asc' }
  });
  categories.forEach(c => {
    console.log(`ID: ${c.id}`);
    console.log(`  Name: ${c.name}`);
    console.log(`  Description: ${c.description || '-'}`);
    console.log(`  Questions: ${c.questions.length} ข้อ`);
    console.log(`  isActive: ${c.isActive}`);
    console.log('');
  });

  // Evaluation Periods
  console.log('\n=== EVALUATION PERIODS ===');
  const periods = await prisma.evaluationPeriod.findMany({
    orderBy: { createdAt: 'desc' }
  });
  periods.forEach(p => {
    console.log(`ID: ${p.id} | Name: ${p.name} | Status: ${p.status} | Type: ${p.type}`);
  });

  // Existing assignments
  console.log('\n=== EXISTING ASSIGNMENTS ===');
  const assignments = await prisma.evaluatorAssignment.findMany({
    include: {
      evaluatorUser: { select: { username: true, role: true } },
      category: { select: { name: true } },
      targetDepartment: { select: { code: true, name: true } },
      targetTeam: { select: { code: true, name: true } },
      targetEmployee: { select: { name: true, employeeCode: true } }
    }
  });
  console.log(`Total assignments: ${assignments.length}`);
  if (assignments.length > 0) {
    assignments.slice(0, 20).forEach(a => {
      console.log(`  ${a.evaluatorUser.username} (${a.evaluatorUser.role}) -> type:${a.assignmentType} dept:${a.targetDepartment?.code || '-'} team:${a.targetTeam?.code || '-'} emp:${a.targetEmployee?.name || '-'} category:${a.category?.name || '-'}`);
    });
  }

  // Departments with teams and IDs
  console.log('\n=== DEPARTMENTS & TEAMS WITH IDs ===');
  const depts = await prisma.department.findMany({
    where: { deletedAt: null },
    include: { teams: { where: { deletedAt: null }, orderBy: { code: 'asc' } } },
    orderBy: { code: 'asc' }
  });
  depts.forEach(d => {
    console.log(`Dept: [${d.code}] "${d.name}" id=${d.id}`);
    d.teams.forEach(t => console.log(`  Team: [${t.code}] "${t.name}" id=${t.id}`));
  });

  // Employees in each team for Head assignments
  console.log('\n=== EMPLOYEE COUNTS PER TEAM ===');
  for (const d of depts) {
    for (const t of d.teams) {
      const count = await prisma.employee.count({ where: { teamId: t.id, deletedAt: null } });
      console.log(`${d.code} | ${t.code} : ${count} employees`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
