import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const config = JSON.parse(readFileSync(new URL('../shared/game-config.example.json', import.meta.url)))

test('HTTP contract and invalid requests', async (t) => {
  let modelText = JSON.stringify(config)
  const originalFetch = globalThis.fetch
  process.env.PORT = '0'
  process.env.GEMINI_API_KEY = 'test-key'
  process.env.GEMMA_MODEL = 'gemma-4-26b-a4b-it'
  process.env.ELEVENLABS_API_KEY = 'test-key'
  globalThis.fetch = async (url, options) => {
    if (String(url instanceof Request ? url.url : url).includes('generativelanguage.googleapis.com')) {
      const body = JSON.parse(options.body)
      assert.equal(body.contents[0].parts[1].inlineData.data, Buffer.from('mock image').toString('base64'))
      assert.equal(body.contents[0].parts[1].inlineData.mimeType, 'image/png')
      return Response.json({ candidates: [{ content: { role: 'model', parts: [{ text: modelText }] } }] })
    }
    if (String(url).startsWith('https://api.elevenlabs.io/')) {
      return new Response('ID3mock', { headers: { 'Content-Type': 'audio/mpeg' } })
    }
    return originalFetch(url, options)
  }
  const { default: app } = await import('./index.js')
  if (!app.listening) await new Promise(resolve => app.once('listening', resolve))
  t.after(async () => {
    globalThis.fetch = originalFetch
    await new Promise(resolve => app.close(resolve))
  })
  const url = `http://127.0.0.1:${app.address().port}`
  const health = await fetch(url + '/api/health')
  assert.equal(health.status, 200)
  assert.deepEqual(await health.json(), { status: 'ok' })
  const form = new FormData()
  form.set('image', new Blob(['mock image'], { type: 'image/png' }), 'drawing.png')
  const generated = await fetch(url + '/api/generate', { method: 'POST', body: form })
  assert.equal(generated.status, 200)
  assert.deepEqual(await generated.json(), config)
  const { analyzeImage } = await import('./gemma.js')
  const file = { mimetype: 'image/png', buffer: Buffer.from('mock image') }
  const sceneConfig = {
    ...config,
    character: 'A rider on a pink creature',
    theme: 'A lush forest with tall trees',
    playerColor: '#FF88BB',
    obstacleColor: '#884422',
  }
  modelText = JSON.stringify({ ...sceneConfig, playerSpriteUrl: 'https://example.invalid/upload.png' })
  assert.deepEqual(await analyzeImage(file), sceneConfig)
  modelText = JSON.stringify({ character: ' ', theme: '', title: 123 })
  const defaults = await analyzeImage(file)
  assert.equal(defaults.character, 'hero')
  assert.equal(defaults.theme, 'fantasy')
  assert.equal(defaults.title, 'Drawing Adventure')
  for (const invalid of ['null', '[]', '"forest"']) {
    modelText = invalid
    await assert.rejects(() => analyzeImage(file), /configuration object/)
  }
  modelText = '```json\n' + JSON.stringify({ gameType: 'runner', title: 'x'.repeat(200), playerColor: 'green', collectibleCount: 99, extra: true }) + '\n```'
  const normalized = await analyzeImage(file)
  assert.equal(normalized.gameType, 'platformer')
  assert.equal(normalized.title.length, 150)
  assert.equal(normalized.playerColor, '#58B957')
  assert.equal(normalized.collectibleCount, 8)
  assert.equal(normalized.theme, 'fantasy')
  assert.equal(Object.keys(normalized).length, 10)
  modelText = JSON.stringify({ collectibleCount: -1 })
  assert.equal((await analyzeImage(file)).collectibleCount, 3)
  modelText = 'invalid JSON'
  await assert.rejects(() => analyzeImage(file), SyntaxError)
  const audio = await fetch(url + '/api/audio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: config.audioPrompt }) })
  assert.equal(audio.status, 200)
  assert.equal(audio.headers.get('content-type'), 'audio/mpeg')
  assert.equal(await audio.text(), 'ID3mock')
  for (const [path, options, status] of [
    ['/api/generate', { method: 'POST', body: new FormData() }, 400],
    ['/api/generate', { method: 'POST', body: '{}' }, 400],
    ['/api/audio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' }, 400],
    ['/api/audio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"text":" "}' }, 400],
    ['/api/audio', {}, 404], ['/missing', {}, 404],
  ]) assert.equal((await fetch(url + path, options)).status, status)
})
