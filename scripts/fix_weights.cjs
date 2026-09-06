/**
 * Fix Evaluation Weights + Set periodId = null (all/future periods)
 * 
 * Weight rules (total 15 pts):
 * - SupportSuper: Super=15
 * - Head: Super=10 / SupportSuper=5
 * - SupportHead: Super=5 / SupportSuper=2.5 / Head=7.5
 * - Employee (dept WITH SupportHead: CC,CCAD,CS,MKT,WITHDRAW):
 *     Super=5 / SupportSuper=2.5 / Head=6.25 / SupportHead=1.25
 * - Employee (dept WITHOUT SupportHead: CR, SALES, QA):
 *     Super=5 / SupportSuper=2.5 / Head=7.5
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Departments that have SupportHead
const DEPTS_WITH_SHEAD = new Set(['CC', 'CCAD', 'CS', 'MKT', 'WITHDRAW']);
const DEPTS_WITHOUT_SHEAD = new Set(['CR', 'SALES', 'QA']);

// Nicknames for users from their fullName (extract last word as nickname)
function extractNickname(fullName) {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1];
}

// Determine employee "type" based on position
function getEmployeeType(employee, deptCode) {
  if (!employee) return 'UNKNOWN';
  if (deptCode === 'SUPER') return 'SUPER';

  const pos = (employee.position || '').toUpperCase().trim();

  // Head positions
  if (
    pos === 'HEAD CC' || pos === 'HEAD CR' || pos === 'HEAD CCAD' ||
    pos === 'HEAD CS' || pos === 'HEAD MKT' || pos === 'HEAD SP' ||
    pos === 'HEAD RD' || pos === 'TRANFER'
  ) {
    return 'HEAD';
  }

  // SupportHead positions
  if (
    pos.startsWith('SUPPORT.H') ||
    pos === 'SUPPORT TRANSFER'
  ) {
    return 'SUPPORT_HEAD';
  }

  // QA employees treated specially (evaluated with HEAD category, but EMP weight)
  if (deptCode === 'QA') return 'EMPLOYEE_NO_SHEAD';

  if (DEPTS_WITH_SHEAD.has(deptCode)) return 'EMPLOYEE_WITH_SHEAD';
  if (DEPTS_WITHOUT_SHEAD.has(deptCode)) return 'EMPLOYEE_NO_SHEAD';

  return 'EMPLOYEE_NO_SHEAD';
}

// Weight lookup: evaluatorRole x targetType -> weightPercentage (out of 100, where 100% = 15 pts)
// weights are actual points, so divide by 15 * 100 for percentage
function getWeight(evaluatorRole, targetType) {
  // weightPercentage stored as: (points / 15) * 100
  const W = {
    SUPER: {
      SUPER: 0,            // Super doesn't evaluate other Supers (SSuper is evaluated by Super)
      SSUPERVISER: 100,    // SupportSuper: Super gives 15 pts = 100%
      HEAD: (10/15)*100,   // Head: Super gives 10 pts
      SUPPORT_HEAD: (5/15)*100,
      EMPLOYEE_WITH_SHEAD: (5/15)*100,
      EMPLOYEE_NO_SHEAD: (5/15)*100,
    },
    SUPPORT_SUPER: {
      HEAD: (5/15)*100,
      SUPPORT_HEAD: (2.5/15)*100,
      EMPLOYEE_WITH_SHEAD: (2.5/15)*100,
      EMPLOYEE_NO_SHEAD: (2.5/15)*100,
    },
    HEAD: {
      SUPPORT_HEAD: (7.5/15)*100,
      EMPLOYEE_WITH_SHEAD: (6.25/15)*100,
      EMPLOYEE_NO_SHEAD: (7.5/15)*100,
    },
    SUPPORT_HEAD: {
      EMPLOYEE_WITH_SHEAD: (1.25/15)*100,
    }
  };

  const evaluatorWeights = W[evaluatorRole];
  if (!evaluatorWeights) return null;
  const weight = evaluatorWeights[targetType];
  return weight !== undefined ? weight : null;
}

async function main() {
  console.log('=== FIXING EVALUATION WEIGHTS ===\n');

  // Load all employees with dept info
  const allEmployees = await prisma.employee.findMany({
    where: { deletedAt: null },
    include: { department: true, team: true }
  });
  const empMap = {};
  allEmployees.forEach(e => { empMap[e.id] = e; });

  // Load all users with role info
  const allUsers = await prisma.user.findMany({
    where: { deletedAt: null },
    include: { department: true, team: true }
  });
  const userMap = {};
  allUsers.forEach(u => { userMap[u.id] = u; });

  // Load all assignments
  const allAssignments = await prisma.evaluatorAssignment.findMany({
    include: {
      evaluatorUser: { include: { department: true, team: true } },
      targetEmployee: { include: { department: true, team: true } }
    }
  });
  console.log(`Total assignments to process: ${allAssignments.length}`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const a of allAssignments) {
    try {
      const evaluatorUser = a.evaluatorUser;
      if (!evaluatorUser) { skipped++; continue; }

      // Determine evaluator role type
      let evaluatorRole;
      const evalDeptCode = evaluatorUser.department?.code;
      const evalUsername = evaluatorUser.username;

      if (evalDeptCode === 'SUPER') {
        // Check if Super or SupportSuper by username
        if (evalUsername.startsWith('SSuper') || evalUsername.startsWith('SSuperA') ||
            evalUsername.startsWith('SSuperB') || evalUsername.startsWith('SSuperC')) {
          evaluatorRole = 'SUPPORT_SUPER';
        } else {
          evaluatorRole = 'SUPER';
        }
      } else if (evaluatorUser.role === 'HEAD') {
        evaluatorRole = 'HEAD';
      } else if (evaluatorUser.role === 'SUPPORT_HEAD') {
        evaluatorRole = 'SUPPORT_HEAD';
      } else {
        skipped++;
        continue;
      }

      // Determine target type
      let targetType = null;
      if (a.assignmentType === 'EMPLOYEE' && a.targetEmployee) {
        const targetEmp = a.targetEmployee;
        const targetDeptCode = targetEmp.department?.code || '';
        targetType = getEmployeeType(targetEmp, targetDeptCode);

        // Special case: SupportSuper is an EMPLOYEE in SUPER dept, but their role target is SSUPERVISER
        if (targetDeptCode === 'SUPER' && evaluatorRole === 'SUPER') {
          targetType = 'SSUPERVISER';
        } else if (targetDeptCode === 'SUPER') {
          // Non-super evaluators don't evaluate Super employees
          skipped++;
          continue;
        }
      } else {
        // TEAM or DEPARTMENT type - skip (old style)
        skipped++;
        continue;
      }

      const newWeight = getWeight(evaluatorRole, targetType);
      if (newWeight === null) {
        // This evaluator shouldn't be evaluating this target
        // delete the invalid assignment
        await prisma.evaluatorAssignment.delete({ where: { id: a.id } });
        console.log(`  🗑️ Deleted invalid: ${evaluatorUser.username} (${evaluatorRole}) -> ${a.targetEmployee?.name} (${targetType})`);
        errors++;
        continue;
      }

      // Update weight and clear periodId (apply to all/future periods)
      const currentWeight = Number(a.weightPercentage);
      if (Math.abs(currentWeight - newWeight) > 0.01 || a.periodId !== null) {
        await prisma.evaluatorAssignment.update({
          where: { id: a.id },
          data: {
            weightPercentage: newWeight,
            periodId: null  // Apply to ALL periods including future
          }
        });
        updated++;
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(`Error processing assignment ${a.id}:`, err.message);
      errors++;
    }
  }

  console.log(`\n✅ Done!`);
  console.log(`  Updated: ${updated} assignments`);
  console.log(`  Skipped (no change): ${skipped}`);
  console.log(`  Deleted/Errors: ${errors}`);

  // Verify final state
  console.log('\n=== WEIGHT VERIFICATION ===');
  const sample = await prisma.evaluatorAssignment.findMany({
    include: {
      evaluatorUser: { select: { username: true, role: true } },
      targetEmployee: { include: { department: { select: { code: true } } } }
    },
    take: 20,
    orderBy: { createdAt: 'asc' }
  });

  const weightCounts = {};
  const allFinal = await prisma.evaluatorAssignment.findMany({});
  allFinal.forEach(a => {
    const w = Number(a.weightPercentage).toFixed(2);
    weightCounts[w] = (weightCounts[w] || 0) + 1;
  });

  console.log('Weight distribution:');
  Object.entries(weightCounts).sort((a,b) => parseFloat(a[0]) - parseFloat(b[0])).forEach(([w, count]) => {
    const pts = (parseFloat(w) / 100 * 15).toFixed(2);
    console.log(`  ${w}% (${pts} pts): ${count} assignments`);
  });

  const finalCount = await prisma.evaluatorAssignment.count();
  const withPeriod = await prisma.evaluatorAssignment.count({ where: { periodId: { not: null } } });
  console.log(`\nTotal assignments: ${finalCount}`);
  console.log(`Assignments with specific period (should be 0): ${withPeriod}`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
