const fs = require('fs');
let s = fs.readFileSync('src/orders/orders.service.lifecycle.spec.ts', 'utf8');
// Find the point where broken appended code starts: the extra empty lines then the it('CONFIRM allows confirmed')
const marker = "\n}\n);\n\n  it('CONFIRM allows confirmed";
const idx = s.indexOf(marker);
if (idx !== -1) {
    s = s.slice(0, idx + 2); // keep the `});` closing main describe
    fs.writeFileSync('src/orders/orders.service.lifecycle.spec.ts', s);
    console.log('Fixed: truncated broken append at index', idx);
} else {
    console.log('Marker not found; checking end');
}
