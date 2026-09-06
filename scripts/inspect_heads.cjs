const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const depts = await prisma.department.findMany({
    where: { deletedAt: null }
  });
  console.log('=== ACTIVE DEPARTMENTS ===');
  console.table(depts.map(d => ({ id: d.id, name: d.name, code: d.code })));

  const teams = await prisma.team.findMany({
    where: { deletedAt: null },
    include: { department: true }
  });
  console.log('=== ACTIVE TEAMS (sub-departments / team units) ===');
  console.table(teams.map(t => ({ id: t.id, name: t.name, code: t.code, dept: t.department?.name, deptCode: t.department?.code })));

  // List all employees in Head or Support Head department/teams
  const headDepts = depts.filter(d => d.name.toLowerCase().includes('head'));
  const headDeptIds = headDepts.map(d => d.id);

  const headEmployees = await prisma.employee.findMany({
    where: {
      deletedAt: null,
      OR: [
        { departmentId: { in: headDeptIds } },
        { department: { name: { in: ['Head', 'Support Head'] } } }
      ]
    },
    include: {
      department: true,
      team: true
    }
  });

  console.log('=== EMPLOYEES IN HEAD & SUPPORT HEAD (Total: ' + headEmployees.length + ') ===');
  console.table(headEmployees.map(e => ({
    code: e.employeeCode,
    name: e.name,
    position: e.position,
    deptName: e.department?.name,
    deptCode: e.department?.code,
    teamName: e.team?.name,
    teamCode: e.team?.code
  })));

  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    include: { department: true, team: true }
  });
  console.log('=== USERS ===');
  console.table(users.map(u => ({
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    role: u.role,
    dept: u.department?.name,
    team: u.team?.name
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
