const fs = require('node:fs');
const path = require('node:path');
const dir = path.resolve(__dirname, '../research');
const file = fs.readdirSync(dir).find(n => n.includes('BI62m6xD'));
const text = fs.readFileSync(path.join(dir, file), 'utf8');
if (process.argv.includes('--list')) {
  const start = 723471, end = 768953;
  const segment = text.slice(start, end);
  console.log([...segment.matchAll(/async (\w+)\(/g)].map(m => `${start + m.index} ${m[1]}`).join('\n'));
  process.exit(0);
}
for (const name of process.argv.slice(2)) {
  const re = new RegExp(`(?:async )?${name}\\([^)]*\\)\\{`, 'g');
  let m;
  while ((m = re.exec(text))) {
    const start = m.index;
    const tail = text.slice(start + m[0].length);
    const next = /\}(?:(?:async )?[a-zA-Z_$][\w$]*\([^)]*\)\{|\}class |\};)/.exec(tail);
    const end = next ? start + m[0].length + next.index + 1 : start + 2000;
    const excerpt = text.slice(start, Math.min(end, start + 11000));
    if (!excerpt.includes('Method not implemented.')) console.log(`${file} @${start}\n${excerpt}\n`);
  }
}
