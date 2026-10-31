import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createApp } from './index.js'
import { validateConfig } from './gemma.js'
const config = JSON.parse(readFileSync(new URL('../shared/game-config.example.json', import.meta.url)))

test('HTTP contract and invalid requests', async (t) => {
  const app = createApp({
    generate: async image => { assert.equal(image.type, 'image/png'); return config },
    audio: async text => { assert.equal(text, config.audioPrompt); return Buffer.from('ID3mock') },
  })
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise(resolve => app.close(resolve)))
  const url = `http://127.0.0.1:${app.address().port}`
  const health = await fetch(url + '/api/health')
  assert.equal(health.status, 200)
  assert.deepEqual(await health.json(), { status: 'ok' })
  const form = new FormData()
  form.set('image', new Blob(['mock image'], { type: 'image/png' }), 'drawing.png')
  const generated = await fetch(url + '/api/generate', { method: 'POST', body: form })
  assert.equal(generated.status, 200)
  assert.deepEqual(await generated.json(), config)
  const audio = await fetch(url + '/api/audio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: config.audioPrompt }) })
  assert.equal(audio.status, 200)
  assert.equal(audio.headers.get('content-type'), 'audio/mpeg')
  assert.equal(await audio.text(), 'ID3mock')
  for (const [path, options, status] of [
    ['/api/generate', { method: 'POST', body: new FormData() }, 400],
    ['/api/generate', { method: 'POST', body: '{}' }, 415],
    ['/api/audio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' }, 400],
    ['/api/audio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"text":" "}' }, 400],
    ['/api/audio', {}, 405], ['/missing', {}, 404],
  ]) assert.equal((await fetch(url + path, options)).status, status)
})

test('configuration validation enforces the agreed format', () => {
  assert.deepEqual(validateConfig(config), config)
  for (const invalid of [
    { ...config, gameType: 'runner' }, { ...config, collectibleCount: -1 },
    { ...config, collectibleCount: '5' }, { ...config, playerColor: 'green' },
    { ...config, extra: true },
    Object.fromEntries(Object.entries(config).filter(([key]) => key !== 'theme')),
  ]) assert.throws(() => validateConfig(invalid))
})
