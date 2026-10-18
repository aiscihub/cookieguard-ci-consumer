import { scenarios, check, readSafe, verifyReport, saveResults, fail } from './common.js';

async function main() {
  const outcomes = [];
  for (const [index, scenario] of scenarios.entries()) {
    const prefix = `CG_CASE_${index}`;
    const code = Number(process.env[`${prefix}_CODE`]);
    check(code === scenario.code, 'Released Action exit code mismatch.');
    check(process.env[`${prefix}_OUTCOME`] === (code === 0 ? 'success' : 'failure'), 'Released Action enforcement mismatch.');
    verifyReport(await readSafe(process.env[`${prefix}_REPORT`]), code);
    outcomes.push({ scenario: scenario.name, expected: scenario.code, observed: code });
  }
  await readSafe(process.env.CG_FIXTURE_LOG);
  await saveResults('action', outcomes);
  process.stdout.write('Remote released Action: exit 0/1/2, failure enforcement, reports, and fixture log checks passed.\n');
}
main().catch(fail);
