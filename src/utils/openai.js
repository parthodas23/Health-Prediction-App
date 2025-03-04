import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY, // Ensure this is loaded correctly
  baseURL: import.meta.env.VITE_OPENAI_BASE_URL,
  dangerouslyAllowBrowser: true, // Use server-side in production
});

export const getPrediction = async (
  age,
  category,
  probDescrip,
  medication,
  { returnFullResponse = false } = {}
) => {
  // Enhanced input validation
  const parsedAge = parseInt(age);
  if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 150) {
    throw new Error("Age must be a valid number between 0 and 150");
  }

  if (typeof category !== "string" || category.trim().length === 0) {
    throw new Error("Category must be a non-empty string");
  }

  if (typeof probDescrip !== "string" || probDescrip.trim().length === 0) {
    throw new Error("Problem description must be a non-empty string");
  }

  // Optional medication validation
  if (medication && typeof medication !== "string") {
    throw new Error("Medication must be a string if provided");
  }

  const prompt = `Predict the health sum-up for a ${parsedAge}-year-old with ${category.trim()} symptoms. Problem description: ${probDescrip.trim()}. Medication: ${
    medication?.trim() || "None"
  }. Provide a short, simple explanation.`;

  try {
    const response = await openai.chat.completions.create({
      model: "meta-llama/llama-3-8b",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.7,
    });

    const prediction = response.choices[0]?.message?.content?.trim();
    if (!prediction) {
      return returnFullResponse
        ? { error: "No valid prediction received", response }
        : "No valid prediction received from the model";
    }

    return returnFullResponse
      ? {
          prediction,
          fullResponse: response,
          metadata: {
            model: response.model,
            usage: response.usage,
            created: response.created,
          },
        }
      : prediction;
  } catch (error) {
    console.error("LLaMA API Error:", error.message);

    const errorResponse = {
      error: error.message,
      status: error.response?.status,
      details: error.response?.data,
    };

    if (error.response?.status === 401) {
      return returnFullResponse
        ? {
            ...errorResponse,
            message: "Authentication error: Please check API key",
          }
        : "Authentication error: Please check API key";
    }
    if (error.response?.status === 429) {
      return returnFullResponse
        ? {
            ...errorResponse,
            message: "Rate limit exceeded: Please try again later",
          }
        : "Rate limit exceeded: Please try again later";
    }

    return returnFullResponse
      ? errorResponse
      : "Error getting prediction: " + error.message;
  }
};

// Example usage:
/*
async function example() {
  try {
    // Simple prediction
    const simpleResult = await getPrediction(
      45,
      "chronic pain",
      "persistent lower back pain for 3 months",
      "naproxen"
    );
    console.log("Simple prediction:", simpleResult);

    // Full response
    const fullResult = await getPrediction(
      45,
      "chronic pain",
      "persistent lower back pain for 3 months",
      "naproxen",
      { returnFullResponse: true }
    );
    console.log("Full response:", fullResult);
  } catch (error) {
    console.error("Error:", error);
  }
}
*/
