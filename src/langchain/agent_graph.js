// agentgraph.js

import { getLLM } from "./llm_setup.js";
import { availableTools } from "./tools.js";

// Convert the object of tools to an array if needed.
const toolsArray = Object.values(availableTools);

// Define the system message identical to background.js.
const systemMessage = {
  role: "system",
  content:
    "You are a helpful assistant interacting with browser tools based on user speech. Use the provided tools when appropriate. Respond concisely.",
};

export const agentGraph = {
  /**
   * Invokes the LLM with the system message and the human message (initial input).
   *
   * @param {Object} initialState - Contains the input, intermediate_steps, and chat_history.
   * @returns {Promise<Object>} The final state with the LLM result appended.
   */
  async invoke(initialState) {
    // Construct messages array using the system message and the user's input.
    const messages = [
      systemMessage,
      {
        role: "human",
        content: initialState.input,
      },
    ];

    // Get the LLM instance and bind tools.
    const llm = getLLM();
    const llmWithTools = llm.bindTools(toolsArray);

    // Call the LLM with the prepared messages.
    const result = await llmWithTools.invoke(messages);

    // Return an updated state containing the LLM result.
    return {
      ...initialState,
      result,
      intermediate_steps: [
        ...initialState.intermediate_steps,
        "LLM invoked and response obtained.",
      ],
    };
  },
};