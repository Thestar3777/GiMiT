// Live integration check: sends the supplied image to Google and generates
// three real ElevenLabs effects. Output files go outside the repository by default.
import 'dotenv/config';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { tmpdir } from 'node:os';

const imagePath = process.argv[2];
if (!imagePath) throw new Error('Usage: node verify-audio.js drawing.png [output-directory]');
const output = process.argv[3] || join(tmpdir(), 'gimit-audio-verification');
process.env.PORT = '0';
const { default: server } = await import('./index.js');
if (!server.listening) await new Promise(resolve => server.once('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
try {
  const image = await readFile(imagePath);
  const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }[extname(imagePath).toLowerCase()];
  const form = new FormData();
  form.append('image', new Blob([image], { type: mime || 'image/png' }), 'drawing' + extname(imagePath));
  const generated = await fetch(`${base}/api/generate`, { method: 'POST', body: form, signal: AbortSignal.timeout(120_000) });
  if (!generated.ok) throw new Error(`Image generation failed: HTTP ${generated.status}`);
  const gameConfig = await generated.json();
  await mkdir(output, { recursive: true });
  await writeFile(join(output, 'game-config.json'), JSON.stringify(gameConfig, null, 2));
  console.log('Image generated game:', gameConfig.title);
  for (const event of ['collect', 'hit', 'win']) {
    const response = await fetch(`${base}/api/audio`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameConfig, event }), signal: AbortSignal.timeout(60_000)
    });
    if (!response.ok) throw new Error(`${event} audio failed: HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    const file = join(output, `${event}.mp3`);
    await writeFile(file, buffer);
    console.log(`${event}: ${buffer.length} bytes; provider=${response.headers.get('x-audio-provider')}; ${file}`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await new Promise(resolve => server.close(resolve));
}
