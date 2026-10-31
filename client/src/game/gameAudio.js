// One controller per generated game. Audio failure never blocks Phaser.
export function createGameAudio(gameConfig, {
  onStatus = () => {},
  AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext,
  fetchAudio = globalThis.fetch,
  apiBase = import.meta.env?.VITE_API_URL || '',
} = {}) {
  let context
  let disposed = false
  let muted = false
  const buffers = new Map()
  const sources = new Set()
  const lastPlayed = new Map()
  const abort = new AbortController()
  try { if (AudioContextClass) context = new AudioContextClass() } catch { /* Optional audio. */ }

  const stopAll = () => {
    for (const source of sources) {
      try { source.stop() } catch { /* Already ended. */ }
      source.disconnect()
    }
    sources.clear()
  }
  return {
    async load() {
      if (!context || disposed) { if (!disposed) onStatus('unavailable'); return }
      onStatus('loading')
      // Sequential requests avoid bursts against provider concurrency limits.
      for (const event of ['collect', 'hit', 'win']) {
        if (disposed) return
        try {
          const response = await fetchAudio(`${apiBase}/api/audio`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameConfig, event }), signal: AbortSignal.any([abort.signal, AbortSignal.timeout(60_000)]),
          })
          if (!response.ok) {
            if ([429, 503].includes(response.status)) break
            continue
          }
          const buffer = await context.decodeAudioData(await response.arrayBuffer())
          if (!disposed) buffers.set(event, buffer)
        } catch { if (disposed) return }
      }
      if (!disposed) onStatus(buffers.size === 3 ? 'ready' : buffers.size ? 'partial' : 'unavailable')
    },
    unlock() {
      if (!context || disposed) return
      // resume is invoked synchronously in a trusted key/pointer handler.
      try {
        void context.resume().catch(() => {})
        const source = context.createBufferSource()
        source.buffer = context.createBuffer(1, 1, context.sampleRate)
        source.connect(context.destination)
        source.onended = () => source.disconnect()
        source.start()
      } catch { /* A later interaction may unlock the context. */ }
    },
    play(event) {
      if (disposed || muted || context?.state !== 'running' || !buffers.has(event)) return
      const now = context.currentTime
      if (now - (lastPlayed.get(event) ?? -Infinity) < (event === 'hit' ? 0.35 : 0.06)) return
      lastPlayed.set(event, now)
      try {
        if (event === 'win') stopAll()
        const source = context.createBufferSource()
        source.buffer = buffers.get(event)
        source.connect(context.destination)
        sources.add(source)
        source.onended = () => { sources.delete(source); source.disconnect() }
        source.start()
      } catch { /* Gameplay continues when audio cannot play. */ }
    },
    setMuted(value) { muted = value; if (muted) stopAll() },
    dispose() {
      disposed = true
      abort.abort()
      stopAll()
      buffers.clear()
      if (context) void context.close().catch(() => {})
    },
  }
}
