import "dotenv/config";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import { analyzeImage } from "./gemma.js";
import { generateAudio } from "./audio.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (["image/png", "image/jpeg", "image/webp"].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PNG, JPEG, and WebP are supported"));
    }
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/generate", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Image required" });
  }

  try {
    const game = await analyzeImage(req.file);
    res.json(game);
  } catch (error) {
    console.error("Gemma error:", error);
    res.status(502).json({ error: "AI generation failed" });
  }
});

app.post("/api/audio", async (req, res) => {
  try {
    const text = req.body?.text;
    if (typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "Text required" });
    }

    const audio = await generateAudio(text);
    res.set("Content-Type", "audio/mpeg");
    res.send(audio);
  } catch (error) {
    console.error("Audio error:", error);
    res.status(502).json({ error: "Audio generation failed" });
  }
});

app.use((err, req, res, next) => {
  res.status(400).json({ error: err.message });
});

const server = app.listen(process.env.PORT || 3001, () => {
  console.log("Backend running on port 3001");
});

export default server;
