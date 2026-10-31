import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

try {
  const response = await ai.models.generateContent({
    model: "gemma-4-26b-a4b-it",
    contents: "Say hello and confirm you are working."
  });

  console.log("SUCCESS! Gemma 4 is accessible.");
  console.log(response.text);
} catch (error) {
  console.error("ERROR:", error.message);
}
