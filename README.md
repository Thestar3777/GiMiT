# Draw to Game

React + Phaser frontend with a Google GenAI image-analysis backend and optional
ElevenLabs gameplay sound effects. Existing game configuration fields are retained;
`shared/game-config.schema.json` also permits optional
`soundEffects: { collect?: string, hit?: string, win?: string }` prompts.

## Run locally

Requires Node.js 22 or newer. Keep API keys only in the ignored `server/.env`.

```bash
cd server
npm install
cp .env.example .env # Only on first setup; preserve your existing .env.
# Set GEMINI_API_KEY, GEMMA_MODEL, and ELEVENLABS_API_KEY in .env.
npm start
```

In another terminal:

```bash
cd client
npm install
npm run dev
```

Vite proxies `/api` to `http://localhost:3001`. For a separate backend host, set
`VITE_API_URL` when building/running the client. It contains a public base URL,
never a provider API key. Production hosting must proxy `/api` or use that base URL.

## API and audio pipeline

- `GET /api/health`: `{ "status": "ok" }`.
- `POST /api/generate`: multipart upload under `image` (PNG/JPEG/WebP, max 5 MiB).
  Returns the Gemma configuration; game type stays `platformer`.
- `POST /api/audio`: `{ "gameConfig": { ... }, "event": "collect" }` (also `hit`
  and `win`). Legacy `{ "text": "..." }` requests still work. Returns MP3 bytes.

After image generation succeeds, Phaser starts immediately and requests the three
sounds sequentially in the background. Custom `soundEffects[event]` prompts are
preferred. Otherwise prompts use title, theme, character, the collect audioPrompt,
and an event-specific description. Sounds use 0.7 seconds for collect, 0.6 for hit,
and 2 for win, with `eleven_text_to_sound_v2` and `mp3_44100_128` output from the
[official ElevenLabs Sound Effects API](https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert).

Successful requests (including concurrent identical requests) share a bounded
30-minute in-memory backend cache. Failed requests are not cached. The client
decodes each effect once per mounted game. Phaser's collect/hit/win handlers
play the buffers locally, with no collision-time network requests. Level restart
reuses them. Replacing/leaving a game aborts loading, stops playback, removes
listeners and closes its audio context.

Click or press a game control to activate audio under browser autoplay rules.
Mute stops current sounds as well as future playback; unmute enables subsequent
events. Sounds that occur before loading/unlocking are skipped, not replayed late.
The final pickup transitions to the victory sound, stopping any pickup tail.
Missing credentials (503), rate limits (429 with Retry-After when supplied),
provider failures (502), timeouts (504), and decode failures leave gameplay usable.
A status beside the mute control reports optional audio availability. There are
no synthesized or bundled fallback effects in the production audio path.

## Verify

```bash
cd server
npm test
cd ../client
npm run build
npm run lint
```

Automated tests mock provider responses and cover request format, cache reuse,
missing keys, rate limits, invalid audio, timeouts, browser unlock, event playback,
mute/unmute, and disposal. Mock test bytes are not proof of live provider access.

To verify real provider access with your own image (uploads it to Google and sends
derived game descriptions to ElevenLabs; provider charges may apply):

```bash
cd server
node verify-audio.js drawing.png /tmp/gimit-audio-verification
# macOS: verify each saved file is decodable and has the expected short duration.
afinfo /tmp/gimit-audio-verification/collect.mp3
afinfo /tmp/gimit-audio-verification/hit.mp3
afinfo /tmp/gimit-audio-verification/win.mp3
```

This script uses the actual local HTTP endpoints and saves configuration plus
MP3s outside the repository. Server logs identify upstream status/model/request
ID when available, without printing API keys. Successful `/api/audio` responses
include `X-Audio-Provider: ElevenLabs` and `X-Audio-Model: eleven_text_to_sound_v2`.
Correlate these with the provider's request/usage history; the header alone is
not independent proof of origin.

In the browser, upload an image, wait for “Game sounds ready,” then collect items,
hit a hazard, and complete the level. Check all three sounds, toggle mute/unmute,
and press R to replay. DevTools Network should show three audio requests per game
and no requests for collisions or level restart. Block `/api/audio` to verify the
game still runs. Upload another drawing to verify old sounds stop.

## Deploy the frontend and API together on Vercel

Use the `GiMiT` repository directory as the Vercel project's **Root Directory**
(the directory containing `vercel.json`), rather than `client/`. If `GiMiT` is
already the repository root, leave the Root Directory field empty. The checked-in
configuration builds `client/dist` and routes `/api/*` to the Express handler in
`api/index.js`. `server/index.js` remains the local development port listener.

Set these variables in the Vercel project's **Production** environment before
redeploying: `ELEVENLABS_API_KEY`, `GEMINI_API_KEY`, and `GEMMA_MODEL`. Use your
existing provider keys; do not commit or upload `server/.env`. A local `.env`
does not configure Vercel. Leave `VITE_API_URL` unset for this combined deployment
so both game generation and sounds use the same origin. Remove any old localhost
or separate API URL override, then rebuild/redeploy the current source, including
`client/src/game/gameAudio.js`.

After deployment:

1. Visit `/api/health`; it must return JSON `{ "status": "ok" }`, not a Vercel 404.
2. Upload a small image (under 4 MiB to allow for Vercel's request-body limit).
3. Confirm the mute button appears and Network shows `/api/audio` requests.
4. Successful audio requests return `audio/mpeg`; a 503 means the production
   ElevenLabs key is missing, and a 429 means the provider rate-limited requests.
5. Click a game control, then collect an item or hit an obstacle to hear effects.

A frontend-only deployment cannot execute Express or call ElevenLabs securely;
Vite's development proxy only runs locally. This setup uses Vercel's
[Node functions and Express support](https://vercel.com/docs/frameworks/backend/express)
and [rewrite configuration](https://vercel.com/docs/routing/rewrites).
