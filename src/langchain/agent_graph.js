// agent_graph.js
import { getLLM } from "./llm_setup.js";
import { bookmarkTool } from "./tools.js";

// For simplicity, we’ll use a single tool in our tools array.
const toolsArray = [bookmarkTool];

const systemMessage = {
  role: "system",
  content:
    "You are a helpful assistant interacting with browser tools based on user speech. Use the provided tools when appropriate. Respond concisely.",
};

export const agentGraph = {
  /**
   * Invokes the agent by calling the LLM with the system message and the user input.
   * The LLM is bound to the available tools so that if a tool call is needed (e.g., to bookmark),
   * the function is automatically used.
   *
   * @param {Object} initialState - Contains at least an `input` property.
   * @returns {Promise<Object>} The final state with the LLM result.
   */
  async invoke(initialState) {
    const messages = [
      systemMessage,
      {
        role: "human",
        content: initialState.input,
      },
    ];

    // Get the LLM instance.
    const llm = getLLM();
    // Bind the available tools (our bookmark tool) to the LLM.
    const llmWithTools = llm.bindTools(toolsArray);
    // Invoke the LLM with the messages.
    const result = await llmWithTools.invoke(messages);

    return {
      ...initialState,
      result,
    };
  },
};