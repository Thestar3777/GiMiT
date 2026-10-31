export async function generateAudio(text) {
  const response = await fetch(
    "https://api.elevenlabs.io/v1/sound-generation",
    {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: text.slice(0, 500),
        duration_seconds: 2,
        prompt_influence: 0.3
      })
    }
  );

  if (!response.ok) {
    throw new Error(
      `ElevenLabs failed: ${response.status}`
    );
  }

  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer);
}
