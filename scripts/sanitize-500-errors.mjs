/**
 * One-shot codemod: scan every API route and replace any `error.message`
 * (or `err.message`) being returned in a 500 response with the generic
 * 'Internal server error' string. Logs already capture full details
 * server-side; the client should never see DB/internal text.
 *
 * Patterns handled:
 *   return NextResponse.json({ error: error.message }, { status: 500 });
 *   return NextResponse.json({ error: err.message }, { status: 500 });
 *   const message = error instanceof Error ? error.message : '...';
 *   return NextResponse.json({ error: message }, { status: 500 });   // (latter form: replaces the ternary, leaves the var)
 *
 * Run: node scripts/sanitize-500-errors.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const files = execSync('find src/app/api -name "route.ts"', { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean);

const stats = { scanned: 0, modified: 0, replacements: 0 };

for (const file of files) {
  stats.scanned++;
  const original = readFileSync(file, 'utf8');
  let updated = original;
  let count = 0;

  // 1. Inline: `error: error.message` (or err.message) where the surrounding
  //    NextResponse.json carries `status: 500`. Hard to match across newlines
  //    safely with a single regex, so use a two-step targeted replace.
  //
  //    `{ error: error.message }, { status: 500 }`  →  `{ error: 'Internal server error' }, { status: 500 }`
  const inlinePat = /\{\s*error:\s*(?:err|error)\.message\s*\}(\s*,\s*\{\s*status:\s*500\s*\})/g;
  updated = updated.replace(inlinePat, (_m, tail) => {
    count++;
    return `{ error: 'Internal server error' }${tail}`;
  });

  // 2. Two-line form:
  //      const message = (err|error) instanceof Error ? \1.message : '...';
  //      return NextResponse.json({ error: message }, { status: 500 });
  //
  //    Replace the message extraction with a fixed string.
  const twoLinePat = /const\s+(message|errorMessage)\s*=\s*(?:err|error)\s+instanceof\s+Error\s*\?\s*(?:err|error)\.message\s*:\s*'([^']*)'/g;
  updated = updated.replace(twoLinePat, (_m, varName) => {
    count++;
    return `const ${varName} = 'Internal server error'`;
  });

  if (updated !== original) {
    writeFileSync(file, updated, 'utf8');
    stats.modified++;
    stats.replacements += count;
    console.log(`  ${file}  (${count} replacement${count === 1 ? '' : 's'})`);
  }
}

console.log(`\nScanned ${stats.scanned} files, modified ${stats.modified}, ${stats.replacements} total replacements.`);
