const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const prisma = new PrismaClient();

async function main() {
  const wb = XLSX.readFile('รายชื่อ.xlsx');
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  let updatedCount = 0;
  const processed = new Set();

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    for (let c = 0; c < row.length; c++) {
      const cellVal = row[c];
      if (!cellVal) continue;
      const cleanVal = String(cellVal).trim();
      if (['ชื่อ-นามสกุล', 'ชื่อเล่น', 'ตำแหน่ง', 'ลำดับ', 'วันเริ่มงาน', 'อายุงาน', 'MYUFA'].includes(cleanVal)) continue;

      if (cleanVal.length < 2) continue;

      const emp = await prisma.employee.findFirst({
        where: {
          deletedAt: null,
          OR: [
            { name: cleanVal },
            { employeeCode: cleanVal },
            { nickname: cleanVal }
          ]
        }
      });

      if (emp && !processed.has(emp.id)) {
        for (let dc = 1; dc <= 6; dc++) {
          const dateVal = row[c + dc];
          if (dateVal !== undefined && dateVal !== null && dateVal !== '') {
            let parsedDate = null;
            if (typeof dateVal === 'number' && dateVal > 30000 && dateVal < 60000) {
              parsedDate = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
            } else if (typeof dateVal === 'string') {
              const m = dateVal.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
              if (m) {
                let d = parseInt(m[1]);
                let mth = parseInt(m[2]) - 1;
                let y = parseInt(m[3]);
                if (y > 2500) y -= 543;
                if (y < 100) y += 2000;
                parsedDate = new Date(y, mth, d);
              }
            } else if (dateVal instanceof Date) {
              parsedDate = dateVal;
            }

            if (parsedDate && !isNaN(parsedDate.getTime())) {
              await prisma.employee.update({
                where: { id: emp.id },
                data: { startDate: parsedDate }
              });
              console.log(`[OK] ${emp.employeeCode} | ${emp.name} -> ${parsedDate.toISOString().split('T')[0]}`);
              processed.add(emp.id);
              updatedCount++;
              break;
            }
          }
        }
      }
    }
  }

  console.log(`\n🎉 Updated total ${updatedCount} employees' start dates.`);
}

main().finally(() => prisma.$disconnect());
