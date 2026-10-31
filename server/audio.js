import { createHash } from 'node:crypto';

const effects = {
  collect: { duration: 0.7, description: 'one bright satisfying item pickup chime' },
  hit: { duration: 0.6, description: 'one soft impact indicating an obstacle collision' },
  win: { duration: 2, description: 'a cheerful short victory fanfare for completing the level' }
};
const cache = new Map();
const TTL = 30 * 60 * 1000;
const MAX_CACHE = 96;

function audioError(message, status, retryAfter) {
  return Object.assign(new Error(message), { status, retryAfter });
}

export function soundRequest(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw audioError('Invalid audio request', 400);
  const { text, gameConfig, event } = input;
  if (gameConfig !== undefined || event !== undefined) {
    if (!Object.hasOwn(effects, event) || !gameConfig || typeof gameConfig !== 'object' || Array.isArray(gameConfig)) {
      throw audioError('Provide gameConfig and event: collect, hit, or win', 400);
    }
    const clean = value => typeof value === 'string' ? value.trim().slice(0, 150) : '';
    const custom = typeof gameConfig.soundEffects?.[event] === 'string' ? gameConfig.soundEffects[event].trim().slice(0, 300) : '';
    const context = [clean(gameConfig.title), clean(gameConfig.theme), clean(gameConfig.character)].filter(Boolean).join(', ');
    const pickup = event === 'collect' ? clean(gameConfig.audioPrompt) : '';
    return {
      text: `${custom || pickup || effects[event].description}. Game: ${context || 'playful platformer'}. ${effects[event].description}. Sound effect only, no speech or background music.`.slice(0, 500),
      duration: effects[event].duration
    };
  }
  if (typeof text !== 'string' || !text.trim()) throw audioError('Text required', 400);
  return { text: text.trim().slice(0, 500), duration: 2 };
}

export async function generateAudio(text, { duration = 2 } = {}) {
  if (!process.env.ELEVENLABS_API_KEY?.trim()) throw audioError('Audio is unavailable: ELEVENLABS_API_KEY is missing', 503);
  if (typeof text !== 'string' || !text.trim()) throw audioError('Text required', 400);
  const body = {
    text: text.trim().slice(0, 500),
    model_id: 'eleven_text_to_sound_v2',
    duration_seconds: Math.max(0.5, Math.min(2, duration)),
    prompt_influence: 0.3
  };
  const key = createHash('sha256').update(JSON.stringify(body)).digest('hex');
  const existing = cache.get(key);
  if (existing && existing.expires > Date.now()) return existing.promise;
  for (const [id, entry] of cache) if (entry.expires <= Date.now()) cache.delete(id);
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value);
  const entry = { expires: Date.now() + TTL };
  entry.promise = (async () => {
    let response;
    try {
      response = await fetch('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128', {
        method: 'POST',
        headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(45_000)
      });
      console.info(`[audio] ElevenLabs status=${response.status} model=${body.model_id} request=${response.headers.get('request-id') || 'unknown'}`);
      if (!response.ok) {
        throw audioError(`ElevenLabs failed: ${response.status}`, response.status === 429 ? 429 : 502, response.headers.get('retry-after'));
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      const isMp3 = buffer.length > 3 && (buffer.subarray(0, 3).toString() === 'ID3' || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0));
      if (!isMp3) throw audioError('ElevenLabs returned invalid MP3 audio', 502);
      return buffer;
    } catch (error) {
      if (cache.get(key) === entry) cache.delete(key);
      if (error.status) throw error;
      throw audioError(error.name === 'TimeoutError' ? 'Audio generation timed out' : 'Audio provider unavailable', error.name === 'TimeoutError' ? 504 : 502);
    }
  })();
  cache.set(key, entry);
  return entry.promise;
}
