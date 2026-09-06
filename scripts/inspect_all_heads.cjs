const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const headEmps = await prisma.employee.findMany({
    where: {
      deletedAt: null,
      department: {
        name: { in: ['Head', 'Support Head'] }
      }
    },
    include: {
      department: true,
      team: true
    },
    orderBy: [
      { team: { code: 'asc' } },
      { position: 'asc' },
      { name: 'asc' }
    ]
  });

  console.log(`Total Head & Support Head employees: ${headEmps.length}`);
  headEmps.forEach(e => {
    console.log(`[${e.employeeCode}] ${e.name.padEnd(15)} | Pos: ${(e.position || '').padEnd(18)} | Dept: ${(e.department?.name || '').padEnd(14)} | Team: ${e.team?.name} (${e.team?.code})`);
  });

  const depts = await prisma.department.findMany({
    where: { deletedAt: null },
    include: { teams: true }
  });
  console.log('\n=== ALL DEPARTMENTS & THEIR TEAMS ===');
  depts.forEach(d => {
    console.log(`Dept: ${d.name} (${d.code})`);
    d.teams.forEach(t => console.log(`   - Team: ${t.name} (${t.code})`));
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
