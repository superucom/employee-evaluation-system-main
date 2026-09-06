/**
 * Deduplicate assignments where periodId = null
 * Keep only 1 assignment per (evaluatorUserId, targetEmployeeId, categoryId)
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== DEDUPLICATING NULL-PERIOD ASSIGNMENTS ===\n');

  const all = await prisma.evaluatorAssignment.findMany({
    where: { periodId: null },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`Total null-period assignments: ${all.length}`);

  // Group by (evaluatorUserId, targetEmployeeId, categoryId)
  const seen = new Map();
  const toDelete = [];

  for (const a of all) {
    const key = `${a.evaluatorUserId}|${a.targetEmployeeId || ''}|${a.targetTeamId || ''}|${a.targetDepartmentId || ''}|${a.categoryId || ''}`;
    if (seen.has(key)) {
      toDelete.push(a.id);
    } else {
      seen.set(key, a.id);
    }
  }

  console.log(`Unique combinations: ${seen.size}`);
  console.log(`Duplicates to delete: ${toDelete.length}`);

  if (toDelete.length > 0) {
    // Delete in batches
    const BATCH_SIZE = 200;
    let deleted = 0;
    for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
      const batch = toDelete.slice(i, i + BATCH_SIZE);
      await prisma.evaluatorAssignment.deleteMany({ where: { id: { in: batch } } });
      deleted += batch.length;
      process.stdout.write(`\r  Deleted ${deleted}/${toDelete.length}...`);
    }
    console.log('\n  ✓ Deduplication done.');
  }

  const final = await prisma.evaluatorAssignment.count();
  console.log(`\n✅ Final total assignments: ${final}`);

  // Check weight distribution
  const allFinal = await prisma.evaluatorAssignment.findMany({});
  const weightCounts = {};
  allFinal.forEach(a => {
    const w = Number(a.weightPercentage).toFixed(2);
    weightCounts[w] = (weightCounts[w] || 0) + 1;
  });

  console.log('\nWeight distribution:');
  Object.entries(weightCounts).sort((a,b) => parseFloat(a[0]) - parseFloat(b[0])).forEach(([w, count]) => {
    const pts = (parseFloat(w) / 100 * 15).toFixed(2);
    console.log(`  ${pts} pts (${w}%): ${count} assignments`);
  });
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
