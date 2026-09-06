/**
 * Setup All Users + Evaluator Assignments
 * =============================================
 * - Creates all missing Head / SupportHead Users
 * - Wipes old assignments and creates new ones per org chart
 * - Super evaluates everyone
 * - SupportSuper evaluates everyone except Super
 * - Head evaluates SupportHead (if any) + employees in own team
 * - SupportHead evaluates employees in own team
 * 
 * Evaluation Categories:
 * - "การประเมิน Head , SupHead" → for SupportSuper, Head, SupportHead, QA employees
 * - "การประเมินพนักงาน"         → for regular employees (non-QA)
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// ======================================================
// CONSTANTS FROM DB (gathered from inspect_categories.cjs)
// ======================================================

const CATEGORY_HEAD_EVAL = 'cmtdwgu4d001ktg2gyd1ycgey';   // การประเมิน Head , SupHead
const CATEGORY_EMP_EVAL  = 'cmte44hdg006xtg8sazosnx14';   // การประเมินพนักงาน

// All active period IDs
const ACTIVE_PERIOD_IDS = [
  'cmtfnzefs0004l704tslnz2nj', // รอบประจำเดือน สิงหาคม 2569
  'cmtfjaitf0002tgpk15bmi9v0', // ทดสอบการประเมิน
  'august-2026-period',         // สิงหาคม 2026
];

// Default password for all new users (must change on first login)
const DEFAULT_PASSWORD = 'Pass@1234';

// ==========================================================
// ORG CHART DEFINITION
// departments that have SupportHead: CC, CCAD, CS, MKT, WITHDRAW
// departments that do NOT have SupportHead: CR, SALES (SP), QA (RD)
// QA employees are evaluated with HEAD category
// ==========================================================
const DEPT_CONFIG = {
  CC:       { deptCode: 'CC',       hasSupportHead: true,  isQA: false },
  CCAD:     { deptCode: 'CCAD',     hasSupportHead: true,  isQA: false },
  CR:       { deptCode: 'CR',       hasSupportHead: false, isQA: false },
  CS:       { deptCode: 'CS',       hasSupportHead: true,  isQA: false },
  MKT:      { deptCode: 'MKT',      hasSupportHead: true,  isQA: false },
  SALES:    { deptCode: 'SALES',    hasSupportHead: false, isQA: false },
  QA:       { deptCode: 'QA',       hasSupportHead: false, isQA: true  },
  WITHDRAW: { deptCode: 'WITHDRAW', hasSupportHead: true,  isQA: false },
};

const TEAM_LETTERS = ['A', 'B', 'C'];

// Username pattern:
// Head CC_A -> HeadCC_A (already exists)
// SHead CC_A -> SHeadCC_A (already exists)
// Head CR_A -> HeadCR_A (missing)
// Head CS_A -> HeadCS_A (missing) ...etc
const getHeadUsername = (deptCode, teamLetter) => {
  const map = {
    CC: 'HeadCC',
    CCAD: 'HeadCCAD',
    CR: 'HeadCR',
    CS: 'HeadCS',
    MKT: 'HeadMKT',
    SALES: 'HeadSP',
    QA: 'HeadRD',
    WITHDRAW: 'Tranfer',  // per user's convention: "Tranfer" = Head of Withdraw
  };
  return `${map[deptCode]}_${teamLetter}`;
};

const getSHeadUsername = (deptCode, teamLetter) => {
  const map = {
    CC:       'SHeadCC',
    CCAD:     'SHeadCCAD',
    CS:       'SHeadCS',
    MKT:      'SHeadMKT',
    WITHDRAW: 'STranfer', // Support Transfer
  };
  return `${map[deptCode]}_${teamLetter}`;
};

const getHeadFullName = (deptCode, teamLetter) => {
  const map = {
    CC:       'Head CallCenter',
    CCAD:     'Head MC (CCAD)',
    CR:       'Head CR',
    CS:       'Head CloseSale',
    MKT:      'Head Marketing',
    SALES:    'Head SalePromotion',
    QA:       'Head QA (RD)',
    WITHDRAW: 'Head Withdraw (Transfer)',
  };
  return `${map[deptCode]} ทีม ${teamLetter}`;
};

const getSHeadFullName = (deptCode, teamLetter) => {
  const map = {
    CC:       'SupportHead CallCenter',
    CCAD:     'SupportHead MC (CCAD)',
    CS:       'SupportHead CloseSale',
    MKT:      'SupportHead Marketing',
    WITHDRAW: 'SupportHead Withdraw (Support Transfer)',
  };
  return `${map[deptCode]} ทีม ${teamLetter}`;
};

// Team code pattern for each dept
const getTeamCode = (deptCode, teamLetter) => {
  const teamCodeMap = {
    CC:       `CC_TEAM_${teamLetter}`,
    CCAD:     `CCAD_TEAM_${teamLetter}`,
    CR:       `CR_TEAM_${teamLetter}`,
    CS:       `CS_TEAM_${teamLetter}`,
    MKT:      `MKT_TEAM_${teamLetter}`,
    SALES:    teamLetter === 'A' ? 'SALE_TEAM_A' : teamLetter === 'B' ? 'SEAL_TEAM_B' : 'SEALS_TEAM_C',
    QA:       `QA_TEAM_${teamLetter}`,
    WITHDRAW: `WD_TEAM_${teamLetter}`,
  };
  return teamCodeMap[deptCode];
};

const getSuperTeamCode = (teamLetter) => `SUPER_${teamLetter}`;

async function main() {
  console.log('=======================================================');
  console.log('🚀 STARTING FULL USER + ASSIGNMENT SETUP');
  console.log('=======================================================\n');

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  // ========================================
  // 1. Load all departments and teams
  // ========================================
  const allDepts = await prisma.department.findMany({
    where: { deletedAt: null },
    include: { teams: { where: { deletedAt: null } } }
  });
  const deptMap = {};     // code -> dept
  const teamMap = {};     // code -> team
  allDepts.forEach(d => {
    deptMap[d.code] = d;
    d.teams.forEach(t => { teamMap[t.code] = t; });
  });

  // ========================================
  // 2. Create missing Head & SupportHead Users
  // ========================================
  console.log('📝 STEP 1: Creating/verifying Head and SupportHead users...\n');
  const createdUsers = {};

  // Super and SupportSuper users already exist - just load them
  const superUsers = {};  // teamLetter -> {super: User, ssuper: User}
  for (const letter of TEAM_LETTERS) {
    const su = await prisma.user.findFirst({ where: { username: `Super${letter}`, deletedAt: null } });
    const ss = await prisma.user.findFirst({ where: { username: `SSuper${letter}`, deletedAt: null } });
    superUsers[letter] = { super: su, ssuper: ss };
    if (su) console.log(`  ✓ Super${letter} already exists`);
    if (ss) console.log(`  ✓ SSuper${letter} already exists`);
  }

  // Create/verify Head and SupportHead for all depts
  for (const [deptCode, config] of Object.entries(DEPT_CONFIG)) {
    const dept = deptMap[deptCode];
    if (!dept) { console.warn(`  ⚠️ Dept ${deptCode} not found!`); continue; }

    for (const letter of TEAM_LETTERS) {
      const teamCode = getTeamCode(deptCode, letter);
      const team = teamMap[teamCode];
      if (!team) { console.warn(`  ⚠️ Team ${teamCode} not found!`); continue; }

      // Head
      const headUsername = getHeadUsername(deptCode, letter);
      let headUser = await prisma.user.findFirst({ where: { username: headUsername, deletedAt: null } });
      if (!headUser) {
        headUser = await prisma.user.create({
          data: {
            username: headUsername,
            passwordHash,
            fullName: getHeadFullName(deptCode, letter),
            role: 'HEAD',
            departmentId: dept.id,
            teamId: team.id,
            mustChangePassword: true,
          }
        });
        console.log(`  ✅ Created HEAD user: ${headUsername} -> ${deptCode} ${teamCode}`);
      } else {
        // Ensure role is HEAD
        if (headUser.role !== 'HEAD' || headUser.departmentId !== dept.id || headUser.teamId !== team.id) {
          await prisma.user.update({ where: { id: headUser.id }, data: { role: 'HEAD', departmentId: dept.id, teamId: team.id } });
          console.log(`  🔄 Updated HEAD user: ${headUsername}`);
        } else {
          console.log(`  ✓ ${headUsername} already exists`);
        }
      }
      if (!createdUsers[deptCode]) createdUsers[deptCode] = {};
      if (!createdUsers[deptCode][letter]) createdUsers[deptCode][letter] = {};
      createdUsers[deptCode][letter].head = headUser;

      // SupportHead (if applicable)
      if (config.hasSupportHead) {
        const sheadUsername = getSHeadUsername(deptCode, letter);
        let sheadUser = await prisma.user.findFirst({ where: { username: sheadUsername, deletedAt: null } });
        if (!sheadUser) {
          sheadUser = await prisma.user.create({
            data: {
              username: sheadUsername,
              passwordHash,
              fullName: getSHeadFullName(deptCode, letter),
              role: 'SUPPORT_HEAD',
              departmentId: dept.id,
              teamId: team.id,
              mustChangePassword: true,
            }
          });
          console.log(`  ✅ Created SUPPORT_HEAD user: ${sheadUsername} -> ${deptCode} ${teamCode}`);
        } else {
          if (sheadUser.role !== 'SUPPORT_HEAD' || sheadUser.departmentId !== dept.id || sheadUser.teamId !== team.id) {
            await prisma.user.update({ where: { id: sheadUser.id }, data: { role: 'SUPPORT_HEAD', departmentId: dept.id, teamId: team.id } });
            console.log(`  🔄 Updated SUPPORT_HEAD user: ${sheadUsername}`);
          } else {
            console.log(`  ✓ ${sheadUsername} already exists`);
          }
        }
        createdUsers[deptCode][letter].shead = sheadUser;
      }
    }
  }

  // ========================================
  // 3. Clear ALL existing assignments
  // ========================================
  console.log('\n🗑️  STEP 2: Clearing all existing evaluator assignments...');
  const deleted = await prisma.evaluatorAssignment.deleteMany({});
  console.log(`  ✓ Deleted ${deleted.count} old assignments.\n`);

  // ========================================
  // 4. Load all employees per team
  // ========================================
  const employeesByTeam = {}; // teamCode -> employees[]
  for (const [code, team] of Object.entries(teamMap)) {
    const emps = await prisma.employee.findMany({ where: { teamId: team.id, deletedAt: null } });
    employeesByTeam[code] = emps;
  }

  // ========================================
  // 5. Load all employees in Super dept (these are actual Super/SSuper employees in DB)
  // ========================================
  const superDept = deptMap['SUPER'];

  // ========================================
  // 6. BUILD ASSIGNMENTS
  // ========================================
  console.log('📋 STEP 3: Building evaluator assignments...\n');

  const assignmentsToCreate = [];

  // Helper to add assignments for all periods
  const addAssignment = (evaluatorUserId, assignmentType, targetEmployeeId, categoryId) => {
    // For each active period
    for (const periodId of ACTIVE_PERIOD_IDS) {
      assignmentsToCreate.push({
        evaluatorUserId,
        assignmentType,
        targetEmployeeId,
        periodId,
        categoryId,
        weightPercentage: 100,
        isActive: true,
      });
    }
  };

  // Reload all users with their dept/team
  const allUsers = await prisma.user.findMany({
    where: { deletedAt: null },
    include: { department: true, team: true }
  });

  const userByUsername = {};
  allUsers.forEach(u => { userByUsername[u.username] = u; });

  // Get all active employees per team including Super
  const allEmployees = await prisma.employee.findMany({ where: { deletedAt: null }, include: { team: true, department: true } });

  // Super employees (the ones registered in Super dept)
  const superEmployees = allEmployees.filter(e => e.department?.code === 'SUPER');

  // Non-super employees by team letter
  // Each Super/SSuper covers a specific team letter
  // Super A -> handles teams A across all depts
  // Super B -> handles teams B across all depts
  // Super C -> handles teams C across all depts

  for (const letter of TEAM_LETTERS) {
    const superUser  = userByUsername[`Super${letter}`];
    const ssuperUser = userByUsername[`SSuper${letter}`];

    if (!superUser) { console.warn(`Super${letter} not found!`); continue; }
    if (!ssuperUser) { console.warn(`SSuper${letter} not found!`); continue; }

    // ---- Collect all people in "team letter" scope ----
    // Employees in this team letter across all non-Super departments
    const empInLetter = allEmployees.filter(e =>
      e.team && (e.team.code.endsWith(`_${letter}`) || e.team.code.endsWith(`TEAM_${letter}`)) &&
      e.department?.code !== 'SUPER'
    );

    // Head users of this team letter
    const headUsersInLetter = allUsers.filter(u =>
      u.role === 'HEAD' &&
      u.team && (u.team.code.endsWith(`_${letter}`) || u.team.code.endsWith(`TEAM_${letter}`))
    );
    // SupportHead users of this team letter
    const sheadUsersInLetter = allUsers.filter(u =>
      u.role === 'SUPPORT_HEAD' &&
      u.team && (u.team.code.endsWith(`_${letter}`) || u.team.code.endsWith(`TEAM_${letter}`))
    );
    // SSuper user of this team letter
    const ssuperUserInLetter = userByUsername[`SSuper${letter}`];

    // ---- SUPER evaluates EVERYONE in their team letter ----
    // Including: all employees in non-Super depts, Head users, SHead users, SSuper user
    // Category: HEAD category for Head/SHead/SSuper + QA employees; EMP category for others

    // Evaluate SSuper
    // Super evaluates SSuper (a User, not an Employee -- but evaluations are on Employees, not Users)
    // Actually the EvaluatorAssignment targets employees (not users). Let's check if Super/SSuper are also employees.
    // From DB: SUPER dept has 7 employees in Super A (2), B (2), C (3)
    // So yes, Super / SSuper have corresponding employee records in the SUPER dept

    // Super evaluates all employees in their team letter (including Super dept employees)
    const allEmpInLetterAndSuper = allEmployees.filter(e =>
      e.team && (e.team.code === getSuperTeamCode(letter) ||
                 e.team.code.endsWith(`_${letter}`) ||
                 e.team.code.endsWith(`TEAM_${letter}`))
    );

    for (const emp of allEmpInLetterAndSuper) {
      const isQAEmp = emp.department?.code === 'QA';
      const isSuperEmp = emp.department?.code === 'SUPER';
      // Super employees, QA employees, Head/SHead role users in matching employee records get HEAD category
      // For super dept employees themselves: they're Super/SSuper, evaluated with HEAD category
      const catId = (isQAEmp || isSuperEmp) ? CATEGORY_HEAD_EVAL : CATEGORY_EMP_EVAL;
      addAssignment(superUser.id, 'EMPLOYEE', emp.id, catId);
    }
    console.log(`  ✓ Super${letter}: assigned to evaluate ${allEmpInLetterAndSuper.length} employees`);

    // ---- SSSUPER evaluates everyone EXCEPT Super employees ----
    const empForSSuper = allEmpInLetterAndSuper.filter(e => e.department?.code !== 'SUPER');
    for (const emp of empForSSuper) {
      const isQAEmp = emp.department?.code === 'QA';
      const catId = isQAEmp ? CATEGORY_HEAD_EVAL : CATEGORY_EMP_EVAL;
      addAssignment(ssuperUser.id, 'EMPLOYEE', emp.id, catId);
    }
    console.log(`  ✓ SSuper${letter}: assigned to evaluate ${empForSSuper.length} employees (excl. Super)`);

    // ---- HEAD evaluates SupportHead (employee record) + employees in own team ----
    // ---- SUPPORTHEAD evaluates employees in own team ----
    for (const [deptCode, config] of Object.entries(DEPT_CONFIG)) {
      const teamCode = getTeamCode(deptCode, letter);
      const teamEmps = employeesByTeam[teamCode] || [];
      const dept = deptMap[deptCode];
      if (!dept) continue;

      const headUsername = getHeadUsername(deptCode, letter);
      const headUser = userByUsername[headUsername];
      if (!headUser) { console.warn(`  ⚠️ Head user ${headUsername} not found!`); continue; }

      // Head evaluates regular employees in team (SupportHead is handled separately below)
      for (const emp of teamEmps) {
        const isSHead = (emp.position || '').toUpperCase().includes('SUPPORT.H') || (emp.position || '').toUpperCase().includes('SUPPORT TRANSFER');
        if (!isSHead) {
          const catId = config.isQA ? CATEGORY_HEAD_EVAL : CATEGORY_EMP_EVAL;
          addAssignment(headUser.id, 'EMPLOYEE', emp.id, catId);
        }
      }

      // Head evaluates SupportHead (if exists)
      if (config.hasSupportHead) {
        const sheadUsername = getSHeadUsername(deptCode, letter);
        const sheadUser = userByUsername[sheadUsername];
        if (sheadUser) {
          // Find SupportHead's employee record (if any) in the same team
          // SupportHead users may have a corresponding employee in the dept
          // For now we'll skip this if they have no employee record, as evaluations target employees
          // Find employees whose name matches the SHead user's fullName or by team + position
          const sheadEmp = allEmployees.find(e =>
            e.teamId === teamMap[teamCode]?.id &&
            (e.position?.toUpperCase().includes('SUPPORT') || e.position?.toUpperCase().includes('HEAD'))
          );
          // Actually let's find by position type in the team
          const headAndSheadEmps = allEmployees.filter(e =>
            e.teamId === teamMap[teamCode]?.id &&
            (
              (e.position || '').toUpperCase().includes('SUPPORT.H') ||
              (e.position || '').toUpperCase().includes('SUPPORT TRANSFER')
            )
          );
          for (const emp of headAndSheadEmps) {
            addAssignment(headUser.id, 'EMPLOYEE', emp.id, CATEGORY_HEAD_EVAL);
          }
          console.log(`    Head ${headUsername}: evaluates ${teamEmps.length} employees + ${headAndSheadEmps.length} SHead employees`);

          // SupportHead evaluates employees in team
          for (const emp of teamEmps) {
            addAssignment(sheadUser.id, 'EMPLOYEE', emp.id, config.isQA ? CATEGORY_HEAD_EVAL : CATEGORY_EMP_EVAL);
          }
          console.log(`    SHead ${sheadUsername}: evaluates ${teamEmps.length} employees`);
        }
      } else {
        console.log(`    Head ${headUsername}: evaluates ${teamEmps.length} employees (no SHead)`);
      }
    }
  }

  // ========================================
  // 7. Insert all assignments in batches
  // ========================================
  console.log(`\n💾 STEP 4: Inserting ${assignmentsToCreate.length} total assignments...`);
  const BATCH_SIZE = 100;
  let totalCreated = 0;
  for (let i = 0; i < assignmentsToCreate.length; i += BATCH_SIZE) {
    const batch = assignmentsToCreate.slice(i, i + BATCH_SIZE);
    await prisma.evaluatorAssignment.createMany({ data: batch, skipDuplicates: true });
    totalCreated += batch.length;
    process.stdout.write(`\r  Inserted ${totalCreated}/${assignmentsToCreate.length}...`);
  }
  console.log(`\n  ✓ Done! Total assignments created: ${totalCreated}\n`);

  // ========================================
  // 8. Summary
  // ========================================
  const allNewUsers = await prisma.user.findMany({
    where: { deletedAt: null },
    include: { department: true, team: true },
    orderBy: [{ role: 'asc' }, { username: 'asc' }]
  });
  console.log('\n=== FINAL USER LIST ===');
  console.table(allNewUsers.map(u => ({
    username: u.username,
    fullName: u.fullName,
    role: u.role,
    dept: u.department?.code || '-',
    team: u.team?.code || '-',
  })));

  const totalAssignments = await prisma.evaluatorAssignment.count();
  console.log(`\n✅ SETUP COMPLETE!`);
  console.log(`   Total Users: ${allNewUsers.length}`);
  console.log(`   Total Assignments: ${totalAssignments}`);
  console.log(`   Default password for new users: ${DEFAULT_PASSWORD}`);
  console.log(`   All new users must change password on first login.\n`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
