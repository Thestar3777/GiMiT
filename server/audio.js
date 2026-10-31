export async function generateAudio(text) {
  if (!process.env.ELEVENLABS_API_KEY) {
    const error = new Error('Audio generation requires ELEVENLABS_API_KEY')
    error.status = 503
    throw error
  }
  const response = await fetch('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'xi-api-key': process.env.ELEVENLABS_API_KEY, Accept: 'audio/mpeg' },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(120_000),
  })
  if (!response.ok) throw new Error(`Audio provider returned ${response.status}`)
  const audio = Buffer.from(await response.arrayBuffer())
  if (!audio.length) throw new Error('Audio provider returned empty audio')
  return audio
}
