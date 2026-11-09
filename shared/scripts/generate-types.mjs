// Generates TypeScript types from the JSON Schemas that api/scripts/export_schemas.py writes.
// Run through `pnpm gen:schemas` at the repo root, which exports the schemas first.
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compile } from 'json-schema-to-typescript';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const schemaDir = join(packageRoot, 'schemas');
const outDir = join(packageRoot, 'src', 'generated');
const banner =
  '/* Generated from the Pydantic models in api/. Do not edit; run `pnpm gen:schemas`. */';

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const schemaFiles = (await readdir(schemaDir)).filter((file) => file.endsWith('.json')).sort();
const exportLines = [];

for (const file of schemaFiles) {
  const name = basename(file, '.json');
  const schema = JSON.parse(await readFile(join(schemaDir, file), 'utf8'));
  const source = await compile(schema, name, {
    bannerComment: banner,
    additionalProperties: false,
    strictIndexSignatures: true,
  });
  await writeFile(join(outDir, `${name}.ts`), source);
  exportLines.push(`export type * from './${name}';`);
}

await writeFile(join(outDir, 'index.ts'), `${banner}\n${exportLines.join('\n')}\n`);
console.log(`Generated ${schemaFiles.length} type file(s) in shared/src/generated`);
