import { createServer } from 'node:http'
import { pathToFileURL } from 'node:url'
import { generateGame, validateConfig } from './gemma.js'
import { generateAudio } from './audio.js'

function fail(status, message) {
  return Object.assign(new Error(message), { status })
}

async function readBody(request, limit) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > limit) throw fail(413, 'Request body too large')
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

export function createApp({ generate = generateGame, audio = generateAudio } = {}) {
  return createServer(async (req, res) => {
    const json = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(data))
    }
    res.setHeader('Access-Control-Allow-Origin', process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    try {
      const path = new URL(req.url, 'http://localhost').pathname
      if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }
      if (path === '/api/health' && req.method === 'GET') return json(200, { status: 'ok' })
      if (!['/api/health', '/api/generate', '/api/audio'].includes(path)) return json(404, { error: 'Not found' })
      if (req.method !== 'POST' || path === '/api/health') return json(405, { error: 'Method not allowed' })
      const contentType = req.headers['content-type'] || ''
      if (path === '/api/generate') {
        if (!/^multipart\/form-data\s*;/i.test(contentType)) throw fail(415, 'Expected multipart/form-data')
        const body = await readBody(req, 11 * 1024 * 1024)
        let form
        try {
          form = await new Request('http://localhost', { method: 'POST', headers: { 'Content-Type': contentType }, body }).formData()
        } catch { throw fail(400, 'Invalid multipart body') }
        const images = form.getAll('image')
        const image = images[0]
        if (images.length !== 1 || !(image instanceof Blob) || !image.size) throw fail(400, 'Provide one nonempty image under field image')
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(image.type)) throw fail(415, 'Expected a PNG, JPEG, or WebP image')
        if (image.size > 10 * 1024 * 1024) throw fail(413, 'Image must be at most 10 MiB')
        return json(200, validateConfig(await generate(image)))
      }
      if (contentType.split(';')[0].trim().toLowerCase() !== 'application/json') throw fail(415, 'Expected application/json')
      const body = await readBody(req, 32 * 1024)
      let data
      try { data = JSON.parse(body.toString()) } catch { throw fail(400, 'Invalid JSON') }
      if (!data || typeof data.text !== 'string' || !data.text.trim() || data.text.length > 5000) throw fail(400, 'text must be a nonempty string of at most 5000 characters')
      const result = await audio(data.text.trim())
      res.writeHead(200, { 'Content-Type': 'audio/mpeg' })
      res.end(result)
    } catch (error) {
      const status = error.status || (error.name === 'TimeoutError' ? 504 : 502)
      if (!error.status) console.error(error.message)
      json(status, { error: error.status ? error.message : 'Generation provider failed' })
    }
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 3001)
  createApp().listen(port, () => console.log(`GiMiT API listening on port ${port}`))
}
