import test from 'node:test'
import assert from 'node:assert/strict'
import { createGameAudio } from '../client/src/game/gameAudio.js'

class FakeContext {
  state = 'suspended'
  currentTime = 1
  sampleRate = 44100
  destination = {}
  sources = []
  decoded = 0
  createBuffer() { return {} }
  createBufferSource() {
    const source = { connect() {}, disconnect() {}, start() { this.started = true }, stop() { this.stopped = true } }
    this.sources.push(source)
    return source
  }
  resume() { this.state = 'running'; return Promise.resolve() }
  close() { this.state = 'closed'; return Promise.resolve() }
  async decodeAudioData() { this.decoded++; return {} }
}

test('loads once, unlocks, plays event buffers, mutes, and cleans up', async () => {
  let context
  let requests = 0
  const statuses = []
  const audio = createGameAudio({ title: 'Forest' }, {
    AudioContextClass: class extends FakeContext { constructor() { super(); context = this } },
    onStatus: s => statuses.push(s),
    fetchAudio: async (_url, options) => { requests++; assert.ok(['collect', 'hit', 'win'].includes(JSON.parse(options.body).event)); return new Response('audio') },
  })
  await audio.load()
  assert.equal(requests, 3)
  assert.equal(context.decoded, 3)
  assert.deepEqual(statuses, ['loading', 'ready'])
  audio.play('collect')
  assert.equal(context.sources.length, 0) // Autoplay is respected.
  audio.unlock()
  audio.play('collect')
  const collectSource = context.sources.at(-1)
  assert.equal(collectSource.started, true)
  audio.play('hit')
  const count = context.sources.length
  audio.play('hit')
  assert.equal(context.sources.length, count) // Collision debounce.
  audio.setMuted(true)
  assert.equal(collectSource.stopped, true)
  audio.play('win')
  assert.equal(context.sources.length, count)
  audio.setMuted(false)
  audio.play('win')
  assert.equal(context.sources.length, count + 1)
  assert.equal(requests, 3) // No generation during collisions or replay.
  audio.dispose()
  assert.equal(context.state, 'closed')
  audio.play('collect')
  assert.equal(context.sources.length, count + 1)
})

test('failed or cancelled audio is optional', async () => {
  const statuses = []
  const audio = createGameAudio({}, { AudioContextClass: FakeContext, onStatus: s => statuses.push(s), fetchAudio: async () => new Response('', { status: 429 }) })
  await audio.load()
  assert.equal(statuses.at(-1), 'unavailable')
  assert.doesNotThrow(() => audio.play('hit'))
  audio.dispose()
  let resolve
  const loading = createGameAudio({}, { AudioContextClass: FakeContext, fetchAudio: () => new Promise(r => { resolve = r }) })
  const pending = loading.load()
  loading.dispose()
  resolve(new Response('audio'))
  await pending
  assert.doesNotThrow(() => loading.play('win'))
})
