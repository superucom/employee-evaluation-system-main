const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Check duplicates grouped by evaluatorUserId, targetEmployeeId, categoryId, periodId
  const dups = await p.evaluatorAssignment.groupBy({
    by: ['evaluatorUserId', 'targetEmployeeId', 'categoryId', 'periodId'],
    where: { isActive: true, targetEmployeeId: { not: null } },
    _count: { id: true },
    having: { id: { _count: { gt: 1 } } },
  });

  console.log('Total duplicate assignment sets:', dups.length);

  // Look up details for Thidapa (332500634)
  const thidapa = await p.employee.findFirst({
    where: { employeeCode: '332500634' },
    include: { department: true, team: true }
  });

  if (thidapa) {
    console.log('\nEmployee:', thidapa.name, 'Code:', thidapa.employeeCode, 'Position:', thidapa.position, 'Dept:', thidapa.department?.name, 'Team:', thidapa.team?.name);
    const assigns = await p.evaluatorAssignment.findMany({
      where: { targetEmployeeId: thidapa.id },
      include: { evaluatorUser: true, category: true }
    });
    console.log('\nAll assignments for this employee:');
    assigns.forEach(a => {
      console.log(`- ID: ${a.id} | Evaluator: ${a.evaluatorUser.username} (${a.evaluatorUser.fullName}) | Type: ${a.assignmentType} | Category: ${a.category?.name} | Weight: ${a.weightPercentage}% | Period: ${a.periodId || 'ALL'} | CreatedAt: ${a.createdAt}`);
    });
  }

  // Count total assignments vs distinct assignments
  const total = await p.evaluatorAssignment.count({ where: { isActive: true } });
  console.log('\nTotal active assignments:', total);

  // List all duplicate pairs
  if (dups.length > 0) {
    console.log('\nSample duplicate assignment details (first 5):');
    for (let i = 0; i < Math.min(5, dups.length); i++) {
      const d = dups[i];
      const records = await p.evaluatorAssignment.findMany({
        where: {
          evaluatorUserId: d.evaluatorUserId,
          targetEmployeeId: d.targetEmployeeId,
          categoryId: d.categoryId,
          periodId: d.periodId,
          isActive: true
        },
        include: { evaluatorUser: true, targetEmployee: true, category: true }
      });
      console.log(`\nDuplicate Set #${i + 1} (${records.length} records):`);
      records.forEach(r => {
        console.log(`  id: ${r.id} | Evaluator: ${r.evaluatorUser.username} | Target: ${r.targetEmployee?.name} (${r.targetEmployee?.employeeCode}) | Cat: ${r.category?.name} | CreatedAt: ${r.createdAt}`);
      });
    }
  }
}

main().catch(console.error).finally(() => p.$disconnect());
