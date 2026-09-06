const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== REMAINING ACTIVE DEPARTMENTS ===');
  const depts = await prisma.department.findMany({
    where: { deletedAt: null },
    include: {
      employees: { where: { deletedAt: null } },
      teams: {
        where: { deletedAt: null },
        include: { employees: { where: { deletedAt: null } } }
      }
    },
    orderBy: { name: 'asc' }
  });

  depts.forEach(d => {
    console.log(`\n🏢 Dept: ${d.name} (${d.code}) — Total: ${d.employees.length} คน`);
    d.teams.forEach(t => {
      console.log(`   └─ Team: ${t.name.padEnd(20)} (${t.code.padEnd(12)}) : ${t.employees.length} คน`);
    });
  });

  console.log('\n=== USERS AND ROLES ===');
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    include: { department: true, team: true },
    orderBy: { role: 'asc' }
  });
  console.table(users.map(u => ({
    username: u.username,
    fullName: u.fullName,
    role: u.role,
    dept: u.department?.name || '-',
    team: u.team?.name || '-'
  })));

  const totalEmployees = await prisma.employee.count({ where: { deletedAt: null } });
  console.log(`\n📊 Total Active Employees in System: ${totalEmployees}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
