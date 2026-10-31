import test from 'node:test'
import assert from 'node:assert/strict'
import { generateAudio, soundRequest } from './audio.js'

test('ElevenLabs requests, cache, and failures', async t => {
  const original = globalThis.fetch
  const originalKey = process.env.ELEVENLABS_API_KEY
  t.after(() => { globalThis.fetch = original; if (originalKey === undefined) delete process.env.ELEVENLABS_API_KEY; else process.env.ELEVENLABS_API_KEY = originalKey })
  process.env.ELEVENLABS_API_KEY = 'test-only'
  let requests = 0
  globalThis.fetch = async (url, options) => {
    requests++
    assert.equal(url, 'https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128')
    assert.equal(options.headers['xi-api-key'], 'test-only')
    assert.equal(JSON.parse(options.body).model_id, 'eleven_text_to_sound_v2')
    assert.equal(JSON.parse(options.body).duration_seconds, 0.7)
    return new Response('ID3test-audio', { headers: { 'Content-Type': 'audio/mpeg' } })
  }
  const [a, b] = await Promise.all([generateAudio('cache-test', { duration: 0.7 }), generateAudio('cache-test', { duration: 0.7 })])
  assert.equal(requests, 1)
  assert.deepEqual(a, b)
  assert.deepEqual(await generateAudio('cache-test', { duration: 0.7 }), a)
  assert.equal(requests, 1)
  globalThis.fetch = async () => new Response('limited', { status: 429, headers: { 'retry-after': '10' } })
  await assert.rejects(generateAudio('rate-limit-test'), e => e.status === 429 && e.retryAfter === '10')
  // A failed request must not poison the cache.
  globalThis.fetch = async () => new Response('ID3recovered')
  assert.equal((await generateAudio('rate-limit-test')).toString(), 'ID3recovered')
  globalThis.fetch = async () => new Response('{"error":"not audio"}')
  await assert.rejects(generateAudio('invalid-test'), /invalid MP3/)
  globalThis.fetch = async () => { throw new DOMException('timeout', 'TimeoutError') }
  await assert.rejects(generateAudio('timeout-test'), e => e.status === 504)
  delete process.env.ELEVENLABS_API_KEY
  await assert.rejects(generateAudio('missing-key-test'), e => e.status === 503)
})

test('event prompts use custom effects or meaningful game context', () => {
  for (const event of ['collect', 'hit', 'win']) {
    const request = soundRequest({ event, gameConfig: { title: 'Dragon Quest', theme: 'forest', character: 'pink rider', soundEffects: { hit: 'Dragon wing impact' } } })
    assert.match(request.text, /Dragon Quest, forest, pink rider/)
    assert.ok(request.duration >= 0.5 && request.duration <= 2)
    if (event === 'hit') assert.match(request.text, /Dragon wing impact/)
  }
  assert.equal(soundRequest({ text: 'legacy prompt' }).text, 'legacy prompt')
  assert.throws(() => soundRequest({ gameConfig: {}, event: 'invalid' }))
  assert.throws(() => soundRequest({ gameConfig: {}, event: '__proto__' }))
  assert.throws(() => soundRequest(null))
})
