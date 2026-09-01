import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contracts = path.join(root, 'packages', 'shared-types', 'contracts');
const ajv = new Ajv2020({ allErrors: true, strict: true, validateFormats: false });

for (const name of ['hls-analysis-job-v1', 'hls-analysis-result-v1']) {
  const schema = JSON.parse(fs.readFileSync(path.join(contracts, `${name}.schema.json`), 'utf8'));
  const fixture = JSON.parse(
    fs.readFileSync(path.join(contracts, 'fixtures', `${name}.json`), 'utf8'),
  );
  const validate = ajv.compile(schema);
  if (!validate(fixture)) {
    console.error(`${name} fixture violates its shared schema`, validate.errors);
    process.exitCode = 1;
  }
}

if (!process.exitCode) {
  console.log('HLS analysis contracts are valid.');
}
