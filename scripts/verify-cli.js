import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { withFixture } from './fixture.js';
import { scenarios, captured, check, readSafe, verifyReport, saveResults, fail } from './common.js';

async function main() {
  const root = resolve(process.argv[2] ?? '.');
  const group = process.argv[3] ?? 'cli';
  check(['cli', 'source', 'tarballs'].includes(group), 'Invalid evidence group.');
  const bin = resolve(root, 'node_modules/.bin/cookieguard-ci');
  const version = await captured(bin, ['--version']);
  check(version.code === 0 && version.stdout.trim() === '0.1.0', 'Installed CLI version mismatch.');
  await mkdir(resolve('artifacts', group), { recursive: true });
  const outcomes = [];
  await withFixture(async origin => {
    for (const scenario of [...scenarios, { name: 'login-only', path: 'login/secure', code: 2 }]) {
      for (const format of ['text', 'json']) {
        const output = resolve('artifacts', group, `${scenario.name}.${format}`);
        const result = await captured(bin, ['scan', `${origin}/${scenario.path ?? scenario.name}`, '--auth-cookie', 'session_id', '--format', format, '--output', output]);
        check(result.code === scenario.code, `CLI outcome mismatch: ${scenario.name}/${format}.`);
        const contents = await readSafe(output);
        check(contents === result.stdout, 'CLI stdout differs from the saved report.');
        if (format === 'json') verifyReport(contents, scenario.code);
        outcomes.push({ scenario: scenario.name, format, expected: scenario.code, observed: result.code });
      }
    }
  });
  await saveResults(group, outcomes);
  process.stdout.write(`${group}: eight text/JSON outcomes passed; login-only endpoint is incomplete; no sentinel disclosure.\n`);
}
main().catch(fail);
