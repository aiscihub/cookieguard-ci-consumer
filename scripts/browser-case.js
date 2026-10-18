import { chromium } from 'playwright';
import { startCookieAudit, assertCookiePolicy } from '@aiscihub/cookieguard-playwright';
import { exitCode, formatJson } from '@aiscihub/cookieguard-core';
import { assertSafe, check, scenarios, fail } from './common.js';

async function main() {
  const [origin, name] = process.argv.slice(2);
  check(/^http:\/\/127\.0\.0\.1:\d+$/.test(origin) && scenarios.some(s => s.name === name), 'Invalid controlled browser fixture.');
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const audit = startCookieAudit(context, { origins: [origin], policy: { authCookies: ['session_id'] } });
    try {
      const page = await context.newPage();
      await page.goto(`${origin}/login/${name}`);
      await page.getByRole('button', { name: 'Create test session' }).click();
      await page.waitForURL(`${origin}/account`);
      const authenticated = (await page.locator('body').innerText()) === 'Authenticated fixture.';
      check(authenticated === (name !== 'absent-auth'), 'Fixture session assertion failed.');
      const report = await audit.evaluate();
      const code = exitCode(report);
      let assertionRaised = false;
      try { assertCookiePolicy(report); } catch { assertionRaised = true; }
      check(assertionRaised === (code !== 0), 'Playwright policy assertion disagrees with the exit status.');
      const contents = formatJson(report);
      assertSafe(contents);
      process.stdout.write(contents);
      process.exitCode = code;
    } finally {
      audit.dispose();
      await context.close();
    }
  } finally { await browser.close(); }
}
main().catch(fail);
