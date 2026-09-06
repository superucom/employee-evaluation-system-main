const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function check() {
  console.log("Checking DB connection and user...");
  const user = await prisma.user.findFirst({ where: { username: "manager" } });
  console.log("User:", user ? { username: user.username, role: user.role, isActive: user.isActive, mustChangePassword: user.mustChangePassword } : "NOT FOUND");

  if (user) {
    const match = await bcrypt.compare("ChangeMe123!", user.passwordHash);
    console.log("Password ChangeMe123! match result:", match);
  }
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
