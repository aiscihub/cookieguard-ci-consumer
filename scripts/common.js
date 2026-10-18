import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

export const SENTINEL = 'COOKIEGUARD_CONSUMER_SESSION_' + 'SENTINEL_62d9a1';
export const scenarios = [
  { name: 'secure', code: 0 },
  { name: 'missing-httponly', code: 1 },
  { name: 'absent-auth', code: 2 },
];
class CheckError extends Error {}
export function check(condition, message) {
  if (!condition) throw new CheckError(message);
}
export function assertSafe(contents) {
  check(!String(contents).includes(SENTINEL), 'Sentinel disclosure detected; output withheld.');
}
export function fail(error) {
  process.stderr.write(error instanceof CheckError ? `${error.message}\n` : 'Consumer verification failed; raw error withheld.\n');
  process.exitCode = 3;
}
const exec = promisify(execFile);
export async function captured(command, args, options = {}) {
  let result;
  try {
    result = { ...await exec(command, args, { encoding: 'utf8', timeout: 60000, maxBuffer: 2 * 1024 * 1024, ...options }), code: 0 };
  } catch (error) {
    result = { stdout: error.stdout ?? '', stderr: error.stderr ?? '', code: error.code };
  }
  assertSafe(result.stdout);
  assertSafe(result.stderr);
  check(Number.isInteger(result.code), 'Consumer child process did not complete normally.');
  return result;
}
export function verifyReport(contents, code) {
  assertSafe(contents);
  const report = JSON.parse(contents);
  check(report.toolVersion === '0.1.0', 'Unexpected toolkit version.');
  check(report.status === ['passed', 'failed', 'incomplete'][code], 'Unexpected policy status.');
  if (code === 0) check(report.summary.failures === 0, 'Secure fixture reported a failure.');
  if (code === 1) check(report.findings.some(f => f.ruleId === 'CG001' && f.status === 'confirmed'), 'Missing HttpOnly was not confirmed.');
  if (code === 2) check(report.issues.includes('expected-auth-cookie-not-observed'), 'Missing authentication evidence was not reported.');
  return report;
}
export async function save(relative, contents) {
  assertSafe(contents);
  const path = resolve('artifacts', relative);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents, { mode: 0o600 });
}
export async function saveResults(group, outcomes) {
  await save(`${group}/results.json`, JSON.stringify({ version: '0.1.0', outcomes, sentinelLeaks: 0 }, null, 2) + '\n');
}
export async function readSafe(path) {
  const contents = await readFile(path, 'utf8');
  assertSafe(contents);
  return contents;
}
