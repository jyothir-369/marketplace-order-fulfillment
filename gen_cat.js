const fs = require("fs");
const p = process.argv[1];
const EOL = String.fromCharCode(10);
const lines = [
  "PLACEHOLDER",
];
fs.writeFileSync(p, lines.join(EOL) + EOL, "utf8");
console.log("OK", p, lines.length);
