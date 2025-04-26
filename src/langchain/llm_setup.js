// langchain/llm_setup.js
// IMPORTANT: API Key Management - Never hardcode API keys in client-side code.
// Option 1 (Better): Use chrome.storage to have the user input their key via an options page.
// Option 2 (Insecure Demo): Hardcode temporarily for testing, but REMOVE before distribution.
// Option 3 (Backend): Have the extension communicate with your own secure backend that holds the key.

// For this example, we'll use a placeholder. Replace with your actual setup.
const YOUR_API_KEY = "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"; // <-- !!! REPLACE OR USE STORAGE !!!

// Ensure you have installed the necessary package: npm install @langchain/openai
import { ChatOpenAI } from "@langchain/openai";

// Configure the LLM (e.g., OpenAI)
export function getLLM() {
    if (YOUR_API_KEY === "YOUR_OPENAI_API_KEY" || !YOUR_API_KEY) {
         console.warn("API Key not configured. LLM calls will likely fail.");
         // Optionally throw an error or return a dummy model
         // throw new Error("OpenAI API Key is not configured in llm_setup.js");
    }
    // Adjust model name and parameters as needed
    return new ChatOpenAI({
        apiKey: YOUR_API_KEY,
        modelName: "gpt-3.5-turbo", // Or "gpt-4" etc.
        temperature: 0.2, // Lower temperature for more deterministic tool use
    });
}

// Example of how to retrieve from storage (if you build an options page)
/*
async function getApiKeyFromStorage() {
  const result = await chrome.storage.sync.get(['openaiApiKey']);
  return result.openaiApiKey;
}

export async function getLLM() {
    const apiKey = await getApiKeyFromStorage();
     if (!apiKey) {
         console.error("OpenAI API Key not found in storage. Please configure it in the extension options.");
          throw new Error("API Key not configured.");
     }
    return new ChatOpenAI({ apiKey: apiKey, modelName: "gpt-3.5-turbo", temperature: 0.2 });
}
*/