import { WhatsAppState } from "../types";

// Declare global Puter object
declare global {
  interface Window {
    puter: any;
  }
}

export const aiService = {
  // 1. Voice Order Processing
  // Note: Puter.js doesn't have native Audio-to-Text yet. 
  // We simulate it here, or you could use a free Web Speech API.
  processVoiceOrder: async (audioBase64: string): Promise<{ text: string; product?: string; quantity?: number }> => {
    // Simulation:
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          text: "I want 5 bags of Vermicompost",
          product: "Premium Grade Vermicompost",
          quantity: 5
        });
      }, 1500);
    });
  },

  // 2. Chatbot Logic using Puter.js (FREE GPT/Claude)
  getWhatsAppResponse: async (userText: string, currentState: WhatsAppState, language: string) => {
    // If Puter isn't loaded yet
    if (!window.puter) {
      console.error("Puter.js not loaded");
      return {
        text: "System is initializing... please try again in a second.",
        nextState: currentState
      };
    }

    const prompt = `
      You are a farming assistant bot for "Soilify Kashmir".
      Current state: ${currentState}. Language: ${language}.
      User said: "${userText}".
      
      Respond with a JSON object ONLY. No markdown.
      Structure:
      {
        "text": "Response to user",
        "nextState": "Enum Value from: START, LANGUAGE, LOCATION, MENU, PRODUCT_LIST, QUANTITY, ADDRESS, PAYMENT, CONFIRMED",
        "options": ["Option 1", "Option 2"],
        "extractedData": { "product": "...", "quantity": 1 }
      }

      Product List: Vermicompost (Rs 450), Apple Seeds (Rs 1250), Earthworms (Rs 800).
    `;

    try {
      // Use Puter's chat completion
      const response = await window.puter.ai.chat(prompt);
      const content = response.message.content;
      
      // Clean up markdown code blocks if any
      const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error("Puter AI Error:", error);
      // Fallback response
      return {
        text: "I'm having trouble reaching the farm server. Can you say that again?",
        nextState: currentState
      };
    }
  }
};