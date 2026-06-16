const fs = require('fs')
for (const f of process.argv.slice(2)) {
  let c = fs.readFileSync(f, 'utf8')
  if (c.startsWith('// @ts-nocheck\r\n')) { fs.writeFileSync(f, c.slice('// @ts-nocheck\r\n'.length), 'utf8'); console.log('stripped', f) }
  else if (c.startsWith('// @ts-nocheck\n')) { fs.writeFileSync(f, c.slice('// @ts-nocheck\n'.length), 'utf8'); console.log('stripped', f) }
  else console.log('SKIP', f)
}
