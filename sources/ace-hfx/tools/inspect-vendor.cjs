const fs = require('node:fs');
const path = require('node:path');
const dir = path.resolve(__dirname, '../research');
const terms = process.argv.slice(2);
const filter = process.env.VENDOR_FILE || '';
for (const name of fs.readdirSync(dir).filter(n => n.endsWith('.js'))) {
  if (!name.includes(filter)) continue;
  const source = fs.readFileSync(path.join(dir, name), 'utf8');
  for (const term of terms) {
    if (term.startsWith('@')) {
      const [start, length] = term.slice(1).split(':').map(Number);
      console.log(`${name} @${start}\n${source.slice(start, start + (length || 1500))}\n`);
      continue;
    }
    let from = 0, count = 0;
    while (count < 3) {
      const at = source.indexOf(term, from);
      if (at < 0) break;
      console.log(`${name} [${term}] @${at}\n${source.slice(Math.max(0, at - 100), at + 1000)}\n`);
      from = at + term.length;
      count++;
    }
  }
}
