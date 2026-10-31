import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

try {
  const response = await ai.models.generateContent({
    model: process.env.GEMMA_MODEL,
    contents: "Say hello in one sentence.",
  });

  console.log("SUCCESS:", response.text);
} catch (error) {
  console.error("ERROR MESSAGE:", error.message);
  console.error("ERROR STATUS:", error.status);
  console.error("ERROR CAUSE:", error.cause);
  console.error("FULL ERROR:", error);
}
