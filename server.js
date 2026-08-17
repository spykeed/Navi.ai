import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!process.env.OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY");
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.use(express.json({ limit: "1mb" }));

app.use(express.static(path.join(__dirname, "public")));

app.post("/api/generate", async (req, res) => {
  try {
    const {
      prompt,
      style = "cinematic",
      ratio = "1:1",
      quality = "standard"
    } = req.body;

    if (typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({
        error: "Please enter an image prompt."
      });
    }

    if (prompt.length > 500) {
      return res.status(400).json({
        error: "Prompt must be 500 characters or less."
      });
    }

    const sizes = {
      "1:1": "1024x1024",
      "16:9": "1536x1024",
      "9:16": "1024x1536",
      "21:9": "1536x1024"
    };

    const qualities = {
      standard: "medium",
      high: "high",
      ultra: "high"
    };

    const enhancedPrompt = `
Create an image based on this request:

${prompt.trim()}

Visual style: ${style}.

Make the image visually coherent and detailed.
Do not add text, captions, watermarks, logos, or UI elements
unless explicitly requested.
`;

    const result = await openai.images.generate({
      model: "gpt-image-1",
      prompt: enhancedPrompt,
      size: sizes[ratio] || "1024x1024",
      quality: qualities[quality] || "medium"
    });

    const image = result?.data?.[0];

    if (!image?.b64_json) {
      return res.status(502).json({
        error: "The image service did not return an image."
      });
    }

    res.json({
      success: true,
      image: `data:image/png;base64,${image.b64_json}`
    });

  } catch (error) {
    console.error("Image generation error:", error);

    res.status(500).json({
      error: "Image generation failed. Please try again."
    });
  }
});

app.get("*splat", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => {
  console.log(`Nova AI running on port ${port}`);
});
