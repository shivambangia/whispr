import { END, START, StateGraph, Annotation } from "@langchain/langgraph/web";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { RunnableLambda } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
// Example: Import a second tool from another package or module
import { bookmarkTool, openTabTool, createBookmarkFolderTool, getPageContentTool } from "./tools.js";
import { getLLM } from "./llm_setup.js";

// Define the root state with a messages array and a reducer to concatenate messages.
const GraphState3 = Annotation.Root({
  messages: Annotation({
    reducer: (x, y) => x.concat(y),
  }),
});

// Setup your LLM instance.
const llm = getLLM();


// Add them to an array.
const tools = [bookmarkTool, openTabTool, createBookmarkFolderTool, getPageContentTool];

// Optionally, bind the tools to your LLM if you want the LLM to be able to call them directly.
const llmWithTools = llm.bindTools(tools);

// Create a tool node that aggregates the multiple tools.
const toolNode = new ToolNode(tools);

// Example node function that uses the LLM with tools.
// This node function takes the current state and invokes the LLM.
const callModel = async (state, config) => {
  // Assuming the state messages are in an array.
  const input = { messages: state.messages };
  console.log("Calling LLM with input:", JSON.stringify(input, null, 2)); // Log input
  const result = await llmWithTools.invoke(input.messages);
  console.log("LLM Result:", JSON.stringify(result, null, 2)); // Log LLM output
  // If the result has tool calls, log them clearly
  if (result?.tool_calls?.length > 0) {
    console.log("LLM Tool Calls:", JSON.stringify(result.tool_calls, null, 2));
  }
  return { messages: [result] };
};

// A simple condition function for the graph.
const shouldContinue = (state) => {
  // Define your continuation logic here.
  // For example, if the last message doesn't call any tools, end the process.
  const lastMessage = state.messages[state.messages.length - 1];
  if (!lastMessage || !lastMessage.tool_calls || !lastMessage.tool_calls.length) {
    return END;
  }
  return "tools";
};

// Build the state graph using the nodes.
const workflow3 = new StateGraph(GraphState3)
  .addNode("agent", callModel)
  .addEdge(START, "agent")
  .addNode("tools", toolNode)
  .addEdge("tools", "agent")
  .addConditionalEdges("agent", shouldContinue, ["tools", END]);

// Compile the graph to create an executable application.
const app3 = workflow3.compile({});

/**
 * Runs the langgraph workflow with the current message history.
 * @param {Array<HumanMessage | AIMessage | SystemMessage>} messageHistory - The current conversation history.
 * @returns {Promise<string>} - Resolves to the content of the final assistant message.
 */
export async function runWithHistory(messageHistory) {
  // Generate detailed tool descriptions for the system prompt (can be done once or kept here)
  const toolDescriptions = tools.map(tool => `- ${tool.name}: ${tool.description}`).join("\n");

  // Construct the initial state using the provided message history
  // Ensure the history starts with a system message if needed, or add one if missing.
  const systemPrompt = `You are a helpful assistant. You have the following tools available. Use them when appropriate based on the user's request:\n${toolDescriptions}`;

  // Check if the history already contains a system message. If not, prepend one.
  // Note: LangGraph might handle this, but being explicit can be safer.
  let fullHistory = [...messageHistory]; // Copy the history
  if (fullHistory.length === 0 || fullHistory[0]._getType() !== "system") {
      fullHistory.unshift(new SystemMessage(systemPrompt));
  } else {
      // Optionally update the existing system message if tool descriptions change dynamically
      // fullHistory[0].content = systemPrompt;
  }


  const initialState = {
      messages: fullHistory, // Use the full history directly
  };

  console.log("Agent Graph: Running with initial state:", initialState);

  // Stream events from the workflow.
  const eventStream = app3.streamEvents(
    initialState,
    { version: "v2" }
  );

  let finalMessageContent = "No response generated."; // Default message

  for await (const event of eventStream) {
     console.log("Event:", event.event, "Data:", event.data); // Log event details
     // Check if the event represents the final output of the 'agent' node
     // The final output event has event type "on_chain_end" and name "agent"
     // and its data contains the final state, where the last message is the assistant's response.
     if (
         event.event === 'on_chain_end' &&
         event.name === 'agent' && // Check if it's the end of the agent node
         event.data?.output?.messages &&
         event.data.output.messages.length > 0
     ) {
         const lastMessage = event.data.output.messages[event.data.output.messages.length - 1];
         // Check if the last message is from the assistant and has no tool calls
         // Note: The check for `additional_kwargs.tool_calls` might depend on the exact LLM/Langchain version.
         // AIMessage objects have a `tool_calls` property directly in newer versions.
         // Let's check for the absence of tool_calls more robustly.
         const hasToolCalls = lastMessage.tool_calls && lastMessage.tool_calls.length > 0;
         if (lastMessage._getType() === "ai" && !hasToolCalls && lastMessage.content) {
            finalMessageContent = lastMessage.content;
             console.log("Found potential final message:", finalMessageContent);
             // We assume the last message at the end of the 'agent' node is the final one
             // If the graph logic changes, this might need adjustment.
             // Don't break immediately, let the graph fully finish, just capture the last valid AI message.
         }
     }
  }

  // After the stream is fully processed, return the captured final message.
  console.log(`Returning final message content: ${finalMessageContent}`);
  return finalMessageContent; // Return the content of the final message
}