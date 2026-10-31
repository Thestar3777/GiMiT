import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

const fallback = {
  gameType: "platformer",
  title: "Drawing Adventure",
  character: "hero",
  theme: "fantasy",
  backgroundColor: "#87CEEB",
  playerColor: "#58B957",
  obstacleColor: "#765443",
  collectibleColor: "#FFD700",
  collectibleCount: 5,
  audioPrompt: "Playful arcade coin collection sound"
};

export async function analyzeImage(file) {
  const prompt = `
Analyze this image and create a simple 2D platformer concept.

Return ONLY a JSON object with these exact fields:
gameType, title, character, theme, backgroundColor,
playerColor, obstacleColor, collectibleColor,
collectibleCount, audioPrompt.

Rules:
- gameType must be "platformer".
- Colors must be valid 6-digit hex codes.
- collectibleCount must be between 3 and 8.
- audioPrompt should describe one short game sound.
- No Markdown or explanation.
`;

  const response = await ai.models.generateContent({
    model: process.env.GEMMA_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: file.mimetype,
              data: file.buffer.toString("base64")
            }
          }
        ]
      }
    ]
  });

  const raw = response.text
    .replace(/```json|```/g, "")
    .trim();

  const data = JSON.parse(raw);
  const hex = /^#[0-9A-Fa-f]{6}$/;

  const result = { ...fallback };

  for (const field of ["title", "character", "theme", "audioPrompt"]) {
    if (typeof data[field] === "string") {
      result[field] = data[field].slice(0, 150);
    }
  }

  for (const field of [
    "backgroundColor", "playerColor",
    "obstacleColor", "collectibleColor"
  ]) {
    if (typeof data[field] === "string" && hex.test(data[field])) {
      result[field] = data[field];
    }
  }

  if (Number.isInteger(data.collectibleCount)) {
    result.collectibleCount = Math.max(
      3, Math.min(8, data.collectibleCount)
    );
  }

  return result;
}
