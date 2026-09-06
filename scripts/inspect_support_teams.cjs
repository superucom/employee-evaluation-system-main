const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const supportDepts = await p.department.findMany({
    where: {
      OR: [
        { name: { contains: 'Support', mode: 'insensitive' } },
        { code: { contains: 'SUPPORT', mode: 'insensitive' } },
        { code: { contains: 'SP', mode: 'insensitive' } }
      ]
    },
    include: {
      teams: true,
      _count: { select: { employees: true, users: true, evaluatorAssignments: true } }
    }
  });

  console.log('Support-related Departments in DB:');
  console.log(JSON.stringify(supportDepts, null, 2));

  const targetTeams = await p.team.findMany({
    where: {
      OR: [
        { code: 'TEAM_A' },
        { code: 'TEAM_B' },
        { code: 'TEAM_C' },
        { name: { contains: 'Support', mode: 'insensitive' } }
      ]
    },
    include: {
      department: true,
      _count: { select: { employees: true, users: true, evaluatorAssignments: true } }
    }
  });

  console.log('\nTarget Teams (TEAM_A, TEAM_B, TEAM_C, or Support):');
  console.log(JSON.stringify(targetTeams, null, 2));
}

main().catch(console.error).finally(() => p.$disconnect());
