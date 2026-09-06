const XLSX = require("xlsx");
const path = require("path");

const filePath = path.join(__dirname, "..", "รายชื่อ.xlsx");
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: null });

// Print rows 1-45 to see the management structure
for (let i = 0; i < 45; i++) {
  const row = rawData[i];
  if (row && row.some(c => c !== null && c !== undefined && c !== "")) {
    console.log(`Row ${i + 1}: ${JSON.stringify(row)}`);
  }
}
