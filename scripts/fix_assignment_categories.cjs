const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CATEGORY_HEAD_EVAL = 'cmtdwgu4d001ktg2gyd1ycgey'; // การประเมิน Head , SupHead
const CATEGORY_EMP_EVAL  = 'cmte44hdg006xtg8sazosnx14'; // การประเมินพนักงาน

function isHeadOrSupportOrQA(emp) {
  if (!emp) return false;
  const deptCode = emp.department?.code || '';
  if (deptCode === 'QA' || deptCode === 'SUPER') return true;

  const pos = (emp.position || '').toUpperCase().trim();
  if (
    pos.includes('HEAD') ||
    pos.includes('SUPPORT.H') ||
    pos.includes('SUPPORT TRANSFER') ||
    pos.includes('TRANFER') ||
    pos.includes('TRANSFER') ||
    pos.includes('HRD') ||
    pos.includes('LEADER')
  ) {
    return true;
  }

  return false;
}

async function main() {
  console.log('=== FIXING ASSIGNMENT CATEGORIES ===\n');

  const assignments = await prisma.evaluatorAssignment.findMany({
    include: {
      targetEmployee: { include: { department: true } },
      category: true,
      evaluatorUser: true
    }
  });

  console.log(`Total assignments to check: ${assignments.length}`);

  let updated = 0;
  for (const a of assignments) {
    if (a.assignmentType === 'EMPLOYEE' && a.targetEmployee) {
      const isHead = isHeadOrSupportOrQA(a.targetEmployee);
      const expectedCatId = isHead ? CATEGORY_HEAD_EVAL : CATEGORY_EMP_EVAL;

      if (a.categoryId !== expectedCatId) {
        await prisma.evaluatorAssignment.update({
          where: { id: a.id },
          data: { categoryId: expectedCatId }
        });
        updated++;
      }
    }
  }

  console.log(`✓ Updated category for ${updated} assignments.`);

  // Verify breakdown
  const final = await prisma.evaluatorAssignment.findMany({
    include: {
      category: true,
      targetEmployee: { include: { department: true } }
    }
  });

  const catCounts = {};
  final.forEach(a => {
    const cName = a.category?.name || 'NO_CAT';
    catCounts[cName] = (catCounts[cName] || 0) + 1;
  });

  console.log('\nFinal assignments by category:');
  console.table(catCounts);
}

main().catch(console.error).finally(() => prisma.$disconnect());
