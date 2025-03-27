import { GoogleGenAI } from "@google/genai";
import { config } from "dotenv";
import { writeFileSync } from "fs";
import path from "path";

config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const generateGeminiImage = async (req, res) => {

  try {

    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp-image-generation",
      contents: prompt,
      config: {
        responseModalities: ["Text", "Image"],
      },
    });

    let imageFilename = null;

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const imageData = part.inlineData.data;
        const buffer = Buffer.from(imageData, "base64");

        // Generate a unique filename
        imageFilename = `gemini-image-${Date.now()}.png`;

        // Save the image to the public/images/ folder
        const imagePath = path.join(imageFilename);
        writeFileSync(imagePath, buffer);
        break; // Only save one image
      }
    }

    if (!imageFilename) {
      return res.status(500).json({ error: "Failed to generate image" });
    }

    // Return the image URL
    const imageUrl = `${req.protocol}://${req.get("host")}/images/${imageFilename}`;
    res.json({ imageUrl });

  } catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: "Failed to generate image", details: error.message });
  }
};
