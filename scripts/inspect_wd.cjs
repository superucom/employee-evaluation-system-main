const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const wd = await prisma.employee.findMany({
    where: { department: { code: 'WITHDRAW' }, deletedAt: null },
    include: { team: true }
  });
  console.table(wd.map(e => ({ code: e.employeeCode, name: e.name, pos: e.position, team: e.team?.code })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
