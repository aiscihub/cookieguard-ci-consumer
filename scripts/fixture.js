import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SENTINEL, scenarios } from './common.js';

const names = new Set(scenarios.map(scenario => scenario.name));
function cookie(name) {
  if (name === 'absent-auth') return `theme=${SENTINEL}; Path=/; Secure; HttpOnly; SameSite=Lax`;
  return `session_id=${SENTINEL}; Path=/; Secure; SameSite=Lax${name === 'secure' ? '; HttpOnly' : ''}`;
}
export function createFixture() {
  return createServer((request, response) => {
    const path = new URL(request.url, 'http://127.0.0.1').pathname;
    response.setHeader('Cache-Control', 'no-store');
    if (path === '/') return response.end('Consumer fixture ready.');
    const name = path.split('/').at(-1);
    if (request.method === 'GET' && path === `/${name}` && names.has(name)) {
      response.setHeader('Set-Cookie', cookie(name));
      return response.end('Cookie fixture.');
    }
    if (request.method === 'GET' && path === `/login/${name}` && names.has(name)) {
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      return response.end(`<!doctype html><title>Consumer login fixture</title>
        <button type="button" id="login">Create test session</button>
        <script>document.querySelector('#login').addEventListener('click', async () => {
          await fetch('/session/${name}', {method: 'POST'});
          location.assign('/account');
        });</script>`);
    }
    if (request.method === 'POST' && path === `/session/${name}` && names.has(name)) {
      response.setHeader('Set-Cookie', cookie(name));
      response.writeHead(204);
      return response.end();
    }
    if (path === '/account') {
      const authenticated = (request.headers.cookie ?? '').split(';').some(part => part.trim().startsWith('session_id='));
      return response.end(authenticated ? 'Authenticated fixture.' : 'No authentication cookie.');
    }
    response.writeHead(404);
    response.end('Unknown fixture.');
  });
}
export async function withFixture(run) {
  const server = createFixture();
  try {
    await new Promise((done, reject) => server.once('error', reject).listen(0, '127.0.0.1', done));
    return await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.closeAllConnections();
    if (server.listening) await new Promise(done => server.close(done));
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createFixture();
  server.listen(3000, '127.0.0.1', () => process.stdout.write('Consumer fixture listening on loopback.\n'));
  process.once('SIGTERM', () => server.close());
}
