const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Head & Support Head Department Migration...\n');

  // 1. Fetch all departments and teams
  const allDepts = await prisma.department.findMany({
    include: { teams: true }
  });

  const deptByCode = {};
  allDepts.forEach(d => {
    deptByCode[d.code] = d;
  });

  // Map helper
  const getTargetDeptAndTeam = (pos, currentTeamCode) => {
    const p = (pos || '').toUpperCase().trim();
    let mainTeam = 'A';
    if (currentTeamCode.endsWith('_B') || currentTeamCode.includes('TEAM B') || currentTeamCode.includes('HEAD_B') || currentTeamCode.includes('SUP_H_B')) mainTeam = 'B';
    if (currentTeamCode.endsWith('_C') || currentTeamCode.includes('TEAM C') || currentTeamCode.includes('HEAD_C') || currentTeamCode.includes('SUP_H_C')) mainTeam = 'C';

    let targetDeptCode = null;
    let targetTeamCode = null;

    if (p.includes('RD')) {
      targetDeptCode = 'QA';
      targetTeamCode = `QA_TEAM_${mainTeam}`;
    } else if (p.includes('CR')) {
      targetDeptCode = 'CR';
      targetTeamCode = `CR_TEAM_${mainTeam}`;
    } else if (p.includes('CCAD') || p.includes('MC')) {
      targetDeptCode = 'CCAD'; // MC Department code is CCAD
      targetTeamCode = `CCAD_TEAM_${mainTeam}`;
    } else if (p.includes('CS') || p.includes('CLOSE SALE') || p.includes('CLOSESALE')) {
      targetDeptCode = 'CS'; // CloseSale
      targetTeamCode = `CS_TEAM_${mainTeam}`;
    } else if (p.includes('MKT') || p.includes('MARKETING')) {
      targetDeptCode = 'MKT'; // Marketing
      targetTeamCode = `MKT_TEAM_${mainTeam}`;
    } else if (p.includes('SP') || p.includes('SALE') || p.includes('SALEPOMOTION')) {
      targetDeptCode = 'SALES'; // SalePomotion
      if (mainTeam === 'A') targetTeamCode = 'SALE_TEAM_A';
      else if (mainTeam === 'B') targetTeamCode = 'SEAL_TEAM_B';
      else if (mainTeam === 'C') targetTeamCode = 'SEALS_TEAM_C';
    } else if (p.includes('CC') || p.includes('CALLCENTER')) {
      targetDeptCode = 'CC'; // CallCenter
      targetTeamCode = `CC_TEAM_${mainTeam}`;
    } else if (p.includes('TRANFER') || p.includes('TRANSFER') || p.includes('WITHDRAW')) {
      targetDeptCode = 'WITHDRAW'; // Withdraw
      targetTeamCode = `WD_TEAM_${mainTeam}`;
    }

    return { targetDeptCode, targetTeamCode, mainTeam };
  };

  // 2. Fetch all employees in Head and Support Head
  const headEmployees = await prisma.employee.findMany({
    where: {
      deletedAt: null,
      department: {
        code: { in: ['HEAD', 'SUP_HEAD'] }
      }
    },
    include: {
      department: true,
      team: true
    }
  });

  console.log(`Found ${headEmployees.length} employees in Head & Support Head.`);

  // 3. Move employees
  let movedCount = 0;
  for (const emp of headEmployees) {
    const currentTeamCode = emp.team ? emp.team.code : '';
    const { targetDeptCode, targetTeamCode, mainTeam } = getTargetDeptAndTeam(emp.position, currentTeamCode);

    if (!targetDeptCode) {
      console.warn(`⚠️ Could not determine target department for ${emp.name} (Position: ${emp.position})`);
      continue;
    }

    const targetDept = deptByCode[targetDeptCode];
    if (!targetDept) {
      console.error(`❌ Target department code ${targetDeptCode} not found in DB!`);
      continue;
    }

    const targetTeam = targetDept.teams.find(t => t.code === targetTeamCode) || targetDept.teams[0];

    await prisma.employee.update({
      where: { id: emp.id },
      data: {
        departmentId: targetDept.id,
        teamId: targetTeam ? targetTeam.id : null
      }
    });

    console.log(`✓ Moved [${emp.employeeCode}] ${emp.name.padEnd(12)} (${(emp.position || '').padEnd(16)}) -> Dept: ${targetDept.name} (${targetDept.code}) | Team: ${targetTeam?.name || '-'}`);
    movedCount++;
  }

  console.log(`\n🎉 Successfully moved ${movedCount} employees.\n`);

  // 4. Update Users
  console.log('🔄 Updating System Users and Roles...');
  const users = await prisma.user.findMany({
    include: { department: true, team: true }
  });

  for (const user of users) {
    const un = user.username.toUpperCase();
    let newRole = user.role;
    let newDeptCode = null;
    let newTeamCode = null;

    if (un.startsWith('HEADCC_')) {
      newRole = 'HEAD';
      newDeptCode = 'CC';
      const teamLetter = un.split('_')[1] || 'A';
      newTeamCode = `CC_TEAM_${teamLetter}`;
    } else if (un.startsWith('HEADCCAD_')) {
      newRole = 'HEAD';
      newDeptCode = 'CCAD';
      const teamLetter = un.split('_')[1] || 'A';
      newTeamCode = `CCAD_TEAM_${teamLetter}`;
    } else if (un.startsWith('SHEADCC_')) {
      newRole = 'SUPPORT_HEAD';
      newDeptCode = 'CC';
      const teamLetter = un.split('_')[1] || 'A';
      newTeamCode = `CC_TEAM_${teamLetter}`;
    } else if (un.startsWith('SHEADCCAD_')) {
      newRole = 'SUPPORT_HEAD';
      newDeptCode = 'CCAD';
      const teamLetter = un.split('_')[1] || 'A';
      newTeamCode = `CCAD_TEAM_${teamLetter}`;
    } else if (un.startsWith('SUPER')) {
      newRole = 'EVALUATOR';
      newDeptCode = 'SUPER';
      const teamLetter = un.replace('SUPER', '');
      newTeamCode = `SUPER_${teamLetter}`;
    } else if (un.startsWith('SSUPER')) {
      newRole = 'EVALUATOR';
      newDeptCode = 'SUPER';
      const teamLetter = un.replace('SSUPER', '');
      newTeamCode = `SUPER_${teamLetter}`;
    }

    const updateData = {};
    if (newRole !== user.role) updateData.role = newRole;

    if (newDeptCode && deptByCode[newDeptCode]) {
      const targetDept = deptByCode[newDeptCode];
      updateData.departmentId = targetDept.id;
      if (newTeamCode) {
        const targetTeam = targetDept.teams.find(t => t.code === newTeamCode);
        if (targetTeam) updateData.teamId = targetTeam.id;
      }
    } else if (user.department?.code === 'HEAD' || user.department?.code === 'SUP_HEAD') {
      updateData.departmentId = null;
      updateData.teamId = null;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: updateData
      });
      console.log(`✓ Updated User ${user.username} -> Role: ${updateData.role || user.role} | Dept: ${newDeptCode || '-'}`);
    }
  }

  // 5. Clean up evaluator assignments referencing old Head / Support Head
  console.log('\n🧹 Cleaning up Evaluator Assignments for deleted departments...');
  const oldDeptIds = [deptByCode['HEAD']?.id, deptByCode['SUP_HEAD']?.id].filter(Boolean);
  const oldTeamIds = [
    ...(deptByCode['HEAD']?.teams.map(t => t.id) || []),
    ...(deptByCode['SUP_HEAD']?.teams.map(t => t.id) || [])
  ];

  const deletedAssignments = await prisma.evaluatorAssignment.deleteMany({
    where: {
      OR: [
        { targetDepartmentId: { in: oldDeptIds } },
        { targetTeamId: { in: oldTeamIds } }
      ]
    }
  });
  console.log(`✓ Cleaned up ${deletedAssignments.count} old department assignments.`);

  // 6. Delete old Head and Support Head teams and departments
  console.log('\n🗑️ Deleting old Head and Support Head Departments & Teams...');
  if (oldTeamIds.length > 0) {
    await prisma.team.deleteMany({
      where: { id: { in: oldTeamIds } }
    });
    console.log(`✓ Deleted ${oldTeamIds.length} sub-teams.`);
  }

  if (oldDeptIds.length > 0) {
    await prisma.department.deleteMany({
      where: { id: { in: oldDeptIds } }
    });
    console.log(`✓ Deleted ${oldDeptIds.length} departments (Head & Support Head).`);
  }

  console.log('\n==========================================');
  console.log('✅ ALL MIGRATIONS COMPLETED SUCCESSFULLY!');
  console.log('==========================================\n');
}

main().catch(console.error).finally(() => prisma.$disconnect());
