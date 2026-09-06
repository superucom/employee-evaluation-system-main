const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const ignoreDirs = new Set(['node_modules', '.next', '.git', '.system_generated', 'dist']);

function getModifiedFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (ignoreDirs.has(file)) continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getModifiedFiles(fullPath));
    } else {
      const mtime = stat.mtime;
      const today = new Date();
      // Check if modified in the last 24 hours
      if (today - mtime < 24 * 60 * 60 * 1000) {
        results.push({
          relPath: path.relative(rootDir, fullPath).replace(/\\/g, '/'),
          mtime: mtime.toISOString(),
          size: stat.size
        });
      }
    }
  }
  return results;
}

const files = getModifiedFiles(rootDir);
files.sort((a, b) => a.relPath.localeCompare(b.relPath));
console.log(`Found ${files.length} files modified today:\n`);
files.forEach(f => console.log(`- ${f.relPath} (${f.mtime})`));
