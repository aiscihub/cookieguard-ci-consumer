import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { captured, check, save, fail } from './common.js';

async function main() {
  const source = resolve('toolkit-source');
  const destination = resolve('artifacts/source-packages');
  const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
  const names = ['@aiscihub/cookieguard-core', 'cookieguard-ci', '@aiscihub/cookieguard-playwright'];
  const manifest = [];
  await mkdir(destination, { recursive: true });
  for (const name of names) {
    const result = await captured('npm', ['pack', '--workspace', name, '--ignore-scripts', '--pack-destination', destination, '--json'], { cwd: source });
    check(result.code === 0, 'Production source could not be packed.');
    const [packed] = JSON.parse(result.stdout);
    check(packed.name === name && packed.version === '0.1.0', 'Production tarball identity mismatch.');
    check(packed.integrity === lock.packages[`node_modules/${name}`].integrity, 'Production tarball differs from the published release.');
    manifest.push({ name, version: packed.version, filename: packed.filename, integrity: packed.integrity });
  }
  await save('source-packages/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
  const temporary = await mkdtemp(join(tmpdir(), 'cookieguard-consumer-tarballs-'));
  try {
    await writeFile(join(temporary, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
    await writeFile(join(temporary, 'empty-npmrc'), '');
    const install = await captured('npm', ['install', '--offline', '--ignore-scripts', '--omit=dev', '--omit=optional', '--no-audit', '--no-fund', ...manifest.map(item => join(destination, item.filename))], {
      cwd: temporary,
      env: { ...process.env, npm_config_cache: join(temporary, 'cache'), npm_config_userconfig: join(temporary, 'empty-npmrc') },
    });
    check(install.code === 0, 'Production tarballs could not be installed offline.');
    const runtime = await captured(process.execPath, ['scripts/verify-runtime.js', temporary]);
    check(runtime.code === 0, 'Packed production consumer contains development dependencies.');
    const cli = await captured(process.execPath, ['scripts/verify-cli.js', temporary, 'tarballs']);
    check(cli.code === 0, 'Packed production consumer did not pass the CLI scenarios.');
    process.stdout.write(runtime.stdout + cli.stdout);
  } finally { await rm(temporary, { recursive: true, force: true }); }
  process.stdout.write('Production build/pack: all three tarballs match published integrities and install offline.\n');
}
main().catch(fail);
