const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== EMPLOYEES WITH HEAD / SUPPORT POSITIONS ===');
  const employees = await prisma.employee.findMany({
    where: {
      deletedAt: null,
      OR: [
        { position: { contains: 'Head', mode: 'insensitive' } },
        { position: { contains: 'Support', mode: 'insensitive' } },
        { position: { contains: 'Transfer', mode: 'insensitive' } },
        { position: { contains: 'Super', mode: 'insensitive' } },
        { position: { contains: 'HRD', mode: 'insensitive' } },
        { position: { contains: 'RD', mode: 'insensitive' } },
        { position: { contains: 'SP', mode: 'insensitive' } },
        { position: { contains: 'CR', mode: 'insensitive' } },
        { position: { contains: 'CS', mode: 'insensitive' } },
        { position: { contains: 'MC', mode: 'insensitive' } },
        { department: { code: 'SUPER' } }
      ]
    },
    include: { department: true, team: true },
    orderBy: [{ department: { code: 'asc' } }, { team: { code: 'asc' } }]
  });

  console.table(employees.map(e => ({
    code: e.employeeCode,
    name: e.name,
    position: e.position,
    dept: e.department?.code,
    team: e.team?.code
  })));

  console.log('\n=== CURRENT USERS ===');
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    include: { department: true, team: true },
    orderBy: [{ role: 'asc' }, { username: 'asc' }]
  });

  console.table(users.map(u => ({
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    role: u.role,
    dept: u.department?.code,
    team: u.team?.code
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
