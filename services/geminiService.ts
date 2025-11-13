import { GoogleGenAI, Modality, Type } from "@google/genai";

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Sends an image to the Gemini API to be edited based on a text prompt.
 * @param base64ImageData The base64-encoded image data.
 * @param mimeType The MIME type of the image (e.g., 'image/jpeg').
 * @param prompt The editing instruction for the AI.
 * @returns A promise that resolves to the base64-encoded string of the edited image.
 */
export const editImage = async (
  base64ImageData: string,
  mimeType: string,
  prompt: string
): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64ImageData,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }
    throw new Error("No image was generated in the response.");
  } catch (error) {
    console.error("Error editing image with Gemini:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to edit image: ${error.message}`);
    }
    throw new Error("An unknown error occurred while editing the image.");
  }
};

/**
 * Detects the primary headshot in an image and returns its normalized bounding box.
 * @param base64ImageData The base64-encoded image data.
 * @param mimeType The MIME type of the image.
 * @returns A promise that resolves to the normalized bounding box or null if not found.
 */
export const detectHeadshot = async (
  base64ImageData: string,
  mimeType: string
): Promise<{ x: number; y: number; width: number; height: number } | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { data: base64ImageData, mimeType: mimeType } },
          { text: `Detect the main human face in this image. Respond ONLY with a JSON object that strictly adheres to the provided schema. The object must contain the normalized bounding box coordinates with keys "x", "y", "width", and "height". All values must be numbers between 0.0 and 1.0, representing the position relative to the image's dimensions. If no face is clearly visible, return a JSON object with all four values set to 0.` },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            x: { type: Type.NUMBER },
            y: { type: Type.NUMBER },
            width: { type: Type.NUMBER },
            height: { type: Type.NUMBER },
          },
          required: ["x", "y", "width", "height"],
        },
      },
    });

    const jsonString = response.text.trim();
    if (!jsonString) {
      console.warn("Headshot detection returned an empty response.");
      return null;
    }
    
    const result = JSON.parse(jsonString);

    // Check if a valid face was found (width and height will be > 0)
    if (result && typeof result.width === 'number' && result.width > 0 && result.height > 0) {
      return result;
    }
    
    console.warn("No face detected or zero-value response from API.", result);
    return null;

  } catch (error) {
    console.error("Error detecting headshot with Gemini:", error);
    // Return null to allow graceful fallback to center-cropping
    return null;
  }
};