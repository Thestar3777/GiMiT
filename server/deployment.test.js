import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';

// Uses exactly the handler Vercel imports, rather than the local port listener.
test('Vercel handler serves health/audio without requiring a Gemma API key', async t => {
  delete process.env.GEMINI_API_KEY;
  delete process.env.ELEVENLABS_API_KEY;
  // dotenv must not override this test's deliberate missing credentials.
  process.env.DOTENV_CONFIG_PATH = '/private/tmp/gimit-no-env-for-deployment-test';
  const { default: app } = await import('../api/index.js');
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const health = await fetch(`${base}/api/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: 'ok' });
  const audio = await fetch(`${base}/api/audio`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'A short coin sound' })
  });
  assert.equal(audio.status, 503);
  assert.match((await audio.json()).error, /ELEVENLABS_API_KEY/);
});
