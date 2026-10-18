import { withFixture } from './fixture.js';
import { scenarios, captured, check, verifyReport, save, saveResults, fail } from './common.js';

async function main() {
  const outcomes = [];
  await withFixture(async origin => {
    for (const scenario of scenarios) {
      const result = await captured(process.execPath, ['scripts/browser-case.js', origin, scenario.name]);
      check(result.code === scenario.code, `Browser outcome mismatch: ${scenario.name}.`);
      verifyReport(result.stdout, scenario.code);
      await save(`playwright/${scenario.name}.json`, result.stdout);
      outcomes.push({ scenario: scenario.name, expected: scenario.code, observed: result.code });
    }
  });
  await saveResults('playwright', outcomes);
  process.stdout.write('Published Playwright adapter: JavaScript login flow and process exits 0/1/2 passed; no sentinel disclosure.\n');
}
main().catch(fail);
