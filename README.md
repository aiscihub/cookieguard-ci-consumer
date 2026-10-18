# CookieGuard CI consumer verification

An independent consumer of [CookieGuard CI v0.1.0](https://github.com/aiscihub/cookieguard-ai/releases/tag/ci-v0.1.0).
This repository contains controlled test fixtures and adoption checks. Toolkit
implementation, releases, documentation, and issues stay in
[aiscihub/cookieguard-ai](https://github.com/aiscihub/cookieguard-ai).

The [hosted workflow](.github/workflows/consumer.yml) runs three jobs on Linux with Node 24:

- Install the three exact npm releases with an independent lockfile, without
  development or optional dependencies. Verify CLI text/JSON exits 0/1/2 and
  that a login page alone is incomplete. Separately check out the released source,
  run its production-only install and build, then repeat those CLI checks. Pack
  that build, compare all three tarball integrities with the published packages,
  and install the tarballs offline in another empty project before testing again.
- Install the published Playwright adapter and Chromium, execute a JavaScript
  login flow, assert the fixture's session state, and check process exits 0/1/2.
- Use the released remote Action, pinned to its source commit, and verify report
  uploads plus enforcement of all three outcomes.

Every fixture uses loopback and a synthetic sentinel cookie. Reports, subprocess
stdout/stderr, and fixture logs are checked before evidence is accepted. No
credentials, external application, or toolkit workspace dependency is needed.
These checks validate cookie policy behavior; they do not measure model accuracy.

## Run locally

Requires Node 24 or newer. The CLI needs no browser, native model runtime, or
development dependencies:

```bash
npm ci --omit=dev --omit=optional --ignore-scripts
npm run test:production
```

To verify the authenticated browser workflow:

```bash
npm ci --omit=optional --ignore-scripts
npx --no-install playwright install chromium
npm run test:playwright
```

On Linux use `playwright install --with-deps chromium`. The fixture starts and
stops automatically for these commands. Value-free evidence is written under
`artifacts/`, ignored by Git, and retained for seven days in successful hosted runs.

The separate source-build check uses tag `ci-v0.1.0`, commit
`12a09fe322b135ac2a5aec45cae1f880b717575f`. Nothing is installed from the monorepo
in the published-package and Playwright jobs; dependencies resolve from npm.

License: [MIT](LICENSE).
