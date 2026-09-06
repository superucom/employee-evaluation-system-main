const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({ where: { username: 'SSuperB' } });
  console.log('User SSuperB:', user?.id);

  const assignments = await prisma.evaluatorAssignment.findMany({
    where: { evaluatorUserId: user.id },
    include: {
      category: true,
      targetEmployee: { include: { department: true } }
    }
  });

  console.log(`Total assignments for SSuperB: ${assignments.length}`);
  const byCategory = {};
  assignments.forEach(a => {
    const cName = a.category?.name || 'NO_CATEGORY';
    if (!byCategory[cName]) byCategory[cName] = [];
    byCategory[cName].push({
      emp: a.targetEmployee?.name,
      pos: a.targetEmployee?.position,
      dept: a.targetEmployee?.department?.code
    });
  });

  for (const [cat, list] of Object.entries(byCategory)) {
    console.log(`\n=== Category: "${cat}" (${list.length} people) ===`);
    console.table(list.slice(0, 30));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
