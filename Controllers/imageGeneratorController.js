import { GoogleGenAI } from "@google/genai";
import { Storage } from "@google-cloud/storage";
import { config } from "dotenv";

config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const storage = new Storage();
const bucketName = "oogle-bucket"; 
const bucket = storage.bucket(bucketName);

export const generateGeminiImage = async (req, res) => {
  try {
    const { userId, lessonId, prompt } = req.body;

    if (!userId || !lessonId || !prompt) {
      return res.status(400).json({ error: "userId, lessonId, and prompt are required" });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp-image-generation",
      contents: prompt,
      config: {
        responseModalities: ["Text", "Image"],
      },
    });

    let imageFilename = null;
    let imageUrl = null;

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const imageData = part.inlineData.data;
        const buffer = Buffer.from(imageData, "base64");

        imageFilename = `users/${userId}/lessons/${lessonId}/gemini-image-${Date.now()}.png`;
        const file = bucket.file(imageFilename);

        await file.save(buffer, {
          metadata: { contentType: "image/png" },
        });

        await file.makePublic();

        imageUrl = `https://storage.googleapis.com/${bucketName}/${imageFilename}`;
        break; 
      }
    }

    if (!imageUrl) {
      return res.status(500).json({ error: "Failed to generate image" });
    }

    res.json({ userId, lessonId, imageUrl });

  } catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: "Failed to generate image", details: error.message });
  }
};
