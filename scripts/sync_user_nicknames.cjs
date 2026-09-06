const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const USER_NAME_UPDATES = {
  HeadCR_A: 'HeadCR ดารารัตน์',
  HeadCR_B: 'HeadCR ชญานี',
  HeadCR_C: 'HeadCR สุนิศา',
  HeadCS_A: 'HeadCS รณิดา',
  HeadCS_B: 'HeadCS ธัญลักษณ์',
  HeadCS_C: 'HeadCS เปรมกมล',
  SHeadCS_A: 'Support Head CS วิภาวดี',
  SHeadCS_B: 'Support Head CS รจนาภรณ์',
  SHeadCS_C: 'Support Head CS ลลิตา',
  HeadMKT_A: 'HeadMKT วรพจน์',
  HeadMKT_B: 'HeadMKT อภิญญา',
  HeadMKT_C: 'HeadMKT จิรเดช',
  SHeadMKT_A: 'Support Head MKT เขมณัฏฐ์',
  SHeadMKT_B: 'Support Head MKT จักรพันธ์',
  SHeadMKT_C: 'Support Head MKT ชนิดา',
  HeadRD_A: 'HeadRD อนิศรา',
  HeadRD_B: 'HeadRD เมลดา',
  HeadRD_C: 'HeadRD เจษฎา',
  HeadSP_A: 'HeadSP ธนาวินท์',
  HeadSP_B: 'HeadSP พัฒสน',
  HeadSP_C: 'HeadSP ศราวุธ',
  Tranfer_A: 'Tranfer จิตตมาส',
  Tranfer_B: 'Tranfer ศักรินทร์',
  Tranfer_C: 'Tranfer ธนาพร',
  STranfer_A: 'STranfer เยาวลักษณ์',
  STranfer_B: 'STranfer พีระพัฒน์',
  STranfer_C: 'STranfer ธนพนธ์',
};

async function main() {
  console.log('=== UPDATING USER FULL NAMES ===\n');
  for (const [username, fullName] of Object.entries(USER_NAME_UPDATES)) {
    const u = await prisma.user.findFirst({ where: { username, deletedAt: null } });
    if (u) {
      await prisma.user.update({
        where: { id: u.id },
        data: { fullName }
      });
      console.log(`✓ Updated ${username} -> "${fullName}"`);
    } else {
      console.log(`⚠️ User not found: ${username}`);
    }
  }

  const allUsers = await prisma.user.findMany({
    where: { deletedAt: null },
    include: { department: true, team: true },
    orderBy: [{ role: 'asc' }, { username: 'asc' }]
  });

  console.table(allUsers.map(u => ({
    username: u.username,
    fullName: u.fullName,
    role: u.role,
    dept: u.department?.code,
    team: u.team?.code
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
