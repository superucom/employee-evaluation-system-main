const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const supportDept = await p.department.findFirst({
    where: { code: 'SUPPORT' }
  });

  if (!supportDept) {
    console.log('Support department not found.');
    return;
  }

  console.log('Support Department ID:', supportDept.id, 'deletedAt:', supportDept.deletedAt);

  const res = await p.team.updateMany({
    where: { departmentId: supportDept.id, deletedAt: null },
    data: { deletedAt: new Date(), isActive: false }
  });

  console.log(`Soft-deleted ${res.count} child teams under Support department.`);

  const remainingActiveTeams = await p.team.findMany({
    where: { deletedAt: null },
    include: { department: true }
  });
  console.log(`Remaining active teams: ${remainingActiveTeams.length}`);
}

main().catch(console.error).finally(() => p.$disconnect());
