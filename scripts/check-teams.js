const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const assigns = await prisma.evaluatorAssignment.findMany({
    where: { isActive: true },
    include: { evaluatorUser: true, targetTeam: true, targetDepartment: true, targetEmployee: true }
  });
  console.log("Active assignments:", assigns.length);
  for (const a of assigns) {
    console.log(`- Evaluator: ${a.evaluatorUser?.fullName} | Type: ${a.assignmentType} | Target: ${a.targetEmployee?.name || a.targetDepartment?.name || a.targetTeam?.name} | Weight: ${a.weightPercentage}%`);
  }
}

main().finally(() => prisma.$disconnect());
