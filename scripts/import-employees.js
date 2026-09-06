const XLSX = require("xlsx");
const { PrismaClient } = require("@prisma/client");
const path = require("path");

const prisma = new PrismaClient({ log: ["error"] });

const filePath = path.join(__dirname, "..", "รายชื่อ.xlsx");
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: null });

function parseDate(s) {
  if (!s) return null;
  const str = String(s).trim();
  const parts = str.split("/");
  if (parts.length === 3) {
    const d = parseInt(parts[0]);
    const m = parseInt(parts[1]);
    const y = parseInt(parts[2]);
    if (!isNaN(d) && !isNaN(m) && !isNaN(y)) return new Date(y, m - 1, d);
  }
  return null;
}

function extractEmployees(rows) {
  const employees = [];
  let currentSection = "";

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const col0 = row[0] ? String(row[0]).trim().replace(/\n/g, " ").replace(/\t/g, " ").trim() : null;
    if (col0 &&
        col0 !== "ตำแหน่ง" &&
        !col0.match(/^\d+$/) &&
        col0 !== "ทีม A" &&
        col0 !== "TEAM B" &&
        col0 !== "TEAM C") {
      currentSection = col0;
    }

    const blocks = [
      { seq: row[1], name: row[2], nick: row[4], code: row[5], position: row[6], start: row[7] },
      { seq: row[10], name: row[11], nick: row[13], code: row[14], position: row[15], start: row[16] },
      { seq: row[19], name: row[20], nick: row[22], code: row[23], position: row[24], start: row[25] },
    ];

    const teams = ["A", "B", "C"];

    for (let t = 0; t < 3; t++) {
      const b = blocks[t];
      if (!b.code || !b.name) continue;
      const codeStr = String(b.code).trim();
      const nameStr = String(b.name).trim();
      if (nameStr === "ชื่อ-นามสกุล" || nameStr === "ชื่อ") continue;
      if (!codeStr.match(/^\d+$/)) continue;
      if (b.start && String(b.start).includes("126Y")) continue;

      employees.push({
        employeeCode: codeStr,
        name: nameStr,
        nickname: b.nick ? String(b.nick).trim() : null,
        position: b.position ? String(b.position).trim().replace(/\t/g, "").replace(/\s+/g, " ") : null,
        startDate: parseDate(b.start),
        section: currentSection,
        team: teams[t],
      });
    }
  }
  return employees;
}

async function main() {
  console.log("📋 Reading Excel file...");
  const employees = extractEmployees(rawData);
  console.log(`Found ${employees.length} employees in Excel`);

  // Fetch all teams and departments from DB
  const dbTeams = await prisma.team.findMany({
    where: { deletedAt: null, isActive: true },
    include: { department: true }
  });
  const dbDepts = await prisma.department.findMany({
    where: { deletedAt: null, isActive: true }
  });

  // Helper: find dept by code
  const getDept = (code) => dbDepts.find(d => d.code === code);
  
  // Helper: find team by suffix and dept code
  const getTeamByDeptAndSuffix = (deptCode, suffix) => {
    const dept = getDept(deptCode);
    if (!dept) return null;
    return dbTeams.find(t => {
      const upper = t.name.toUpperCase();
      const matchSuffix =
        (suffix === "A" && (upper.includes("TEAM A") || upper.endsWith(" A"))) ||
        (suffix === "B" && (upper.includes("TEAM B") || upper.endsWith(" B"))) ||
        (suffix === "C" && (upper.includes("TEAM C") || upper.endsWith(" C")));
      return matchSuffix && t.departmentId === dept.id;
    }) || null;
  };

  // Dept references
  const dCC   = getDept("CC");        // CallCenter (CALL CENTER employees)
  const dCCAD = getDept("CCAD");      // CallCenter Admin (CC.AD employees)
  const dMKT  = getDept("MKT");       // Marketing (MKT employees)
  const dSP   = getDept("SALES");     // SalePromotion
  const dWD   = getDept("WITHDRAW");  // Withdraw
  const dCR   = getDept("CR");        // CR/Telesale
  const dQA   = getDept("QA");        // QA

  if (!dCC || !dCCAD || !dMKT || !dSP || !dWD || !dCR || !dQA) {
    console.error("❌ Some departments not found! Available:", dbDepts.map(d => `${d.code}:${d.name}`).join(", "));
    return;
  }

  // Section name (from Excel col 0) → dept code
  // "SUPER" and "H/Support" are management roles - we'll use specific dept based on position
  const sectionToDeptCode = {
    "SUPER":          null,        // management - use CC dept + team
    "H/Support":      null,        // management - use CC dept + team
    "TRANFER":        "SALES",     // Transfer = SP
    "WITHDRAW":       "WITHDRAW",
    "Close Sales":    "SALES",
    "CC.AD":          "CCAD",
    "CALL CENTER":    "CC",
    "Sale Promotion": "SALES",
    "MKT":            "MKT",
    "CR/TELESALE.":   "CR",
    "QA":             "QA",
  };

  function resolveEmployee(emp) {
    const sec = emp.section.trim();
    const pos = (emp.position || "").trim().toUpperCase();
    
    let deptCode = sectionToDeptCode[sec];
    
    // For management sections, pick dept based on position hint
    if (deptCode === null) {
      // If position is clearly sales-related, use SALES dept
      // Otherwise default to CC
      if (pos.includes("SP") || pos.includes("CLOSE") || pos.includes("WD") || pos.includes("CR")) {
        deptCode = "SALES";
      } else if (pos.includes("MKT")) {
        deptCode = "MKT";
      } else if (pos === "HRD") {
        deptCode = "CC"; // HRD under CC
      } else {
        deptCode = "CC"; // default for SUPER / H roles
      }
    }

    const dept = getDept(deptCode);
    if (!dept) {
      console.warn(`  ⚠️  No dept found for code: ${deptCode} (emp: ${emp.name})`);
      return null;
    }

    const team = getTeamByDeptAndSuffix(deptCode, emp.team);

    return {
      employeeCode: emp.employeeCode,
      name: emp.name,
      nickname: emp.nickname,
      position: emp.position || null,
      startDate: emp.startDate,
      departmentId: dept.id,
      teamId: team?.id || null,
      status: "active",
      section: sec,
    };
  }

  // Step 1: Soft-delete all existing employees
  console.log("\n🗑️  Deleting all existing employees...");
  const deleted = await prisma.employee.updateMany({
    where: { deletedAt: null },
    data: { deletedAt: new Date(), status: "inactive" },
  });
  console.log(`Deleted ${deleted.count} employees`);

  // Step 2: Insert all new employees
  console.log("\n➕ Inserting new employees...");
  let inserted = 0;
  let errors = 0;

  for (const emp of employees) {
    const resolved = resolveEmployee(emp);
    if (!resolved) {
      errors++;
      continue;
    }

    try {
      await prisma.employee.upsert({
        where: { employeeCode: resolved.employeeCode },
        update: {
          name: resolved.name,
          nickname: resolved.nickname,
          position: resolved.position,
          startDate: resolved.startDate,
          departmentId: resolved.departmentId,
          teamId: resolved.teamId,
          status: "active",
          deletedAt: null,
        },
        create: {
          employeeCode: resolved.employeeCode,
          name: resolved.name,
          nickname: resolved.nickname,
          position: resolved.position,
          startDate: resolved.startDate,
          departmentId: resolved.departmentId,
          teamId: resolved.teamId,
          status: "active",
        },
      });
      inserted++;
      const deptName = dbDepts.find(d => d.id === resolved.departmentId)?.name || "?";
      const teamObj = dbTeams.find(t => t.id === resolved.teamId);
      console.log(`  ✅ [Team ${emp.team}] [${resolved.section}] ${resolved.name} (${resolved.nickname}) | ${resolved.position} | dept:${deptName} team:${teamObj?.name || "none"}`);
    } catch (err) {
      errors++;
      console.error(`  ❌ Error inserting ${emp.name} (${emp.employeeCode}): ${err.message}`);
    }
  }

  console.log(`\n✅ Done! Inserted: ${inserted}, Errors: ${errors}, Total: ${employees.length}`);
}

main()
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
