const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const duplicatePeriod = await prisma.evaluationPeriod.findFirst({
    where: { name: 'ทดสอบการประเมิน' },
  });

  if (duplicatePeriod) {
    await prisma.evaluationPeriod.update({
      where: { id: duplicatePeriod.id },
      data: { status: 'CLOSED' },
    });
    console.log(`Updated period "${duplicatePeriod.name}" (id: ${duplicatePeriod.id}) status to CLOSED.`);
  } else {
    console.log('Period "ทดสอบการประเมิน" not found.');
  }

  const activePeriods = await prisma.evaluationPeriod.findMany({
    where: { status: 'ACTIVE' },
  });
  console.log('Current ACTIVE periods:', activePeriods.map(p => ({ id: p.id, name: p.name, status: p.status })));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
