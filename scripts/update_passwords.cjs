const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const newPassword = 'Aaaa1234+';
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(newPassword, saltRounds);

  console.log('=== CHANGING PASSWORDS ===');
  console.log(`New password: "${newPassword}"\n`);

  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { username: 'asc' }
  });

  let updatedCount = 0;
  let skippedCount = 0;

  for (const u of users) {
    const isManager = u.username.toLowerCase() === 'manager' || u.role === 'MANAGER';
    const isSSuperB = u.username === 'SSuperB' || u.fullName.includes('คอม');

    if (isManager || isSSuperB) {
      console.log(`⏭️  SKIPPED: [${u.username}] ${u.fullName} (${isManager ? 'Manager' : 'SupportSuper คอม'})`);
      skippedCount++;
      continue;
    }

    await prisma.user.update({
      where: { id: u.id },
      data: {
        passwordHash,
        mustChangePassword: false
      }
    });

    console.log(`✓ UPDATED: [${u.username}] ${u.fullName} -> Password: ${newPassword}`);
    updatedCount++;
  }

  console.log(`\n🎉 Summary: Updated ${updatedCount} users, Skipped ${skippedCount} users.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
