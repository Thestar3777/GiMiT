# Draw to Game

This repository contains the client and server for Draw to Game.

## Game configuration format

The target game configuration is defined in `shared/game-config.schema.json`.
`shared/game-config.example.json` contains the Dinosaur Adventure example with
the exact target values. Client and backend integrations should use these ten
required fields without extra properties. Colors use six-digit hex strings,
and `collectibleCount` is a nonnegative integer. Generated responses should be
plain JSON objects without Markdown fences.

## Project structure

```text
client/
  src/
    App.jsx
    App.css
    game/
      Game.jsx
      PlayScene.js
server/
  index.js
  gemma.js
  audio.js
  .env
.gitignore
README.md
```

## Backend API

Requires Node.js 22 or newer. No server dependencies need installing.

```bash
cd server
cp .env.example .env
npm start
```

Configure `server/.env`: `OLLAMA_URL` defaults to `http://localhost:11434`,
`GEMMA_MODEL` defaults to `gemma3`, and `ELEVENLABS_API_KEY` enables audio.
Run Ollama with the vision-capable Gemma 3 model available (`ollama pull gemma3`).
`CLIENT_ORIGIN` defaults to `http://localhost:5173`; `PORT` defaults to `3001`.

- `GET /api/health` returns `200` with `{ "status": "ok" }` (server liveness).
- `POST /api/generate` accepts multipart form data with one file under `image`
  (PNG, JPEG, or WebP, up to 10 MiB). Returns the configuration object directly,
  validated against the shared schema; `gameType` is always `"platformer"`.
- `POST /api/audio` accepts `application/json` with `{ "text": "..." }` and
  returns MP3 bytes with `Content-Type: audio/mpeg`. Text describes a sound effect,
  such as the configuration's `audioPrompt` (maximum 5,000 characters).

Image generation uses Ollama's schema-constrained chat API:
https://docs.ollama.com/capabilities/structured-outputs
Audio uses ElevenLabs sound effects:
https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert

Errors return `{ "error": "..." }` with an appropriate HTTP status. Missing
ElevenLabs credentials return 503; provider failures return 502 and timeouts 504.
Generation endpoints require their providers to be available; they do not return
mock data when a provider is unavailable.

```bash
curl http://localhost:3001/api/health
curl -F 'image=@drawing.png' http://localhost:3001/api/generate
curl -H 'Content-Type: application/json' \
  -d '{"text":"Playful arcade coin collection sound"}' \
  http://localhost:3001/api/audio --output collection.mp3
cd server
npm test
```

Tests use mocked providers and exercise the HTTP contract and schema validation.
