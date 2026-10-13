// Frankfurt migration, step 3: copy every storage file from the old project to the new one.
// Reads scripts/migrate/.env.migrate (gitignored, never printed):
//   OLD_URL, OLD_SERVICE_KEY, NEW_URL, NEW_SERVICE_KEY
// Resumable: files already copied are recorded in .copied.json and skipped on a re-run.
// Run: node scripts/migrate/03-copy-storage.mjs
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const here = path.dirname(fileURLToPath(import.meta.url))
const env = Object.fromEntries(fs.readFileSync(path.join(here, '.env.migrate'), 'utf8').split(/\r?\n/)
  .filter(l => /^[A-Z_]+=/.test(l)).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
for (const k of ['OLD_URL', 'OLD_SERVICE_KEY', 'NEW_URL', 'NEW_SERVICE_KEY']) if (!env[k]) { console.error('missing ' + k); process.exit(1) }

const opts = { auth: { persistSession: false, autoRefreshToken: false } }
const oldSb = createClient(env.OLD_URL, env.OLD_SERVICE_KEY, opts)
const newSb = createClient(env.NEW_URL, env.NEW_SERVICE_KEY, opts)
const DONE = path.join(here, '.copied.json')
const done = new Set(fs.existsSync(DONE) ? JSON.parse(fs.readFileSync(DONE, 'utf8')) : [])
const save = () => fs.writeFileSync(DONE, JSON.stringify([...done]))

async function listAll(bucket, prefix = '') {
  const out = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await oldSb.storage.from(bucket).list(prefix, { limit: 1000, offset })
    if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`)
    for (const e of data) {
      const p = prefix ? `${prefix}/${e.name}` : e.name
      if (e.id === null) out.push(...await listAll(bucket, p)) // a folder
      else out.push({ path: p, type: e.metadata?.mimetype || 'application/octet-stream' })
    }
    if (data.length < 1000) break
  }
  return out
}

async function copyOne(bucket, f) {
  const key = `${bucket}/${f.path}`
  if (done.has(key)) return 'skip'
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const { data: blob, error: e1 } = await oldSb.storage.from(bucket).download(f.path)
      if (e1) throw e1
      const { error: e2 } = await newSb.storage.from(bucket).upload(f.path, blob, { contentType: f.type, upsert: true })
      if (e2) throw e2
      done.add(key)
      return 'ok'
    } catch (e) {
      if (attempt === 4) { console.log(`FAIL ${key}: ${e?.message || e}`); return 'fail' }
      await new Promise(r => setTimeout(r, 1500 * attempt))
    }
  }
}

const { data: buckets, error } = await oldSb.storage.listBuckets()
if (error) { console.error(error.message); process.exit(1) }
let ok = 0, skip = 0, fail = 0
for (const b of buckets) {
  const files = await listAll(b.id)
  console.log(`${b.id}: ${files.length} files`)
  for (let i = 0; i < files.length; i += 6) {
    const res = await Promise.all(files.slice(i, i + 6).map(f => copyOne(b.id, f)))
    for (const r of res) r === 'ok' ? ok++ : r === 'skip' ? skip++ : fail++
    if ((i / 6) % 10 === 0) { save(); console.log(`  ${b.id}: ${Math.min(i + 6, files.length)}/${files.length}`) }
  }
  save()
}
console.log(`done: copied ${ok}, already there ${skip}, failed ${fail}`)
if (fail) process.exit(2)
