const fs = require('fs');
const path = require('path');
const root = 'C:\\Users\\raghava\\OneDrive\\Desktop\\marketplace-order-fulfillment\\apps\\frontend\\';
const zincTokens = ['zinc-50','zinc-100','zinc-200','zinc-300','zinc-400','zinc-500','zinc-600','zinc-700','zinc-800','zinc-900','zinc-950','text-zinc','bg-zinc','border-zinc'];
let hits = [];
function walk(d) {
  for (const e of fs.readdirSync(d, {withFileTypes: true})) {
    const n = e.name;
    if (n === 'node_modules' || n === '.next' || n === 'dist' || n === '.turbo') continue;
    const p = path.join(d, n);
    if (e.isDirectory()) { walk(p); }
    else if (/\\.(tsx?|jsx?)$/.test(n)) {
      try {
        const c = fs.readFileSync(p, 'utf8');
        const lines = c.split('\\n');
        let inComment = false;
        lines.forEach((l, i) => {
          const t = l.trim();
          if (t.startsWith('/*')) inComment = true;
          if (inComment) { if (t.includes('*/')) inComment = false; return; }
          if (t.startsWith('//')) return;
          for (const z of zincTokens) { if (l.includes(z)) { hits.push(p + ':' + (i+1) + ' -> ' + z); break; } }
        });
      } catch(err) {}
    }
  }
}
walk(root);
if (hits.length === 0) { console.log('CLEAN: no zinc-class usages'); }
else { hits.forEach(h => console.log(h)); }
