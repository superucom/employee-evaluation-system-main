const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany({
    where: {
      deletedAt: null,
      OR: [
        { position: { contains: 'HEAD', mode: 'insensitive' } },
        { position: { contains: 'SUPPORT', mode: 'insensitive' } },
        { position: { contains: 'TRANSFER', mode: 'insensitive' } },
        { position: { contains: 'SUPER', mode: 'insensitive' } },
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

  console.log(`Found ${employees.length} supervisory employees:`);
  employees.forEach(e => {
    console.log(`[${e.department?.code}] Team: ${e.team?.code} | Code: ${e.employeeCode} | Name: "${e.name}" | Position: "${e.position}"`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
