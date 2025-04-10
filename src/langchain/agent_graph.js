import { END, START, StateGraph, Annotation } from "@langchain/langgraph/web";
import { HumanMessage } from "@langchain/core/messages";
import { RunnableLambda } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
// Example: Import a second tool from another package or module
import { bookmarkTool, openTabTool, createBookmarkFolderTool } from "./tools.js";
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
const tools = [bookmarkTool, openTabTool, createBookmarkFolderTool];

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
 * Runs the langgraph workflow with an initial transcript.
 * @param {Array} initialTranscript - An array of messages forming the initial transcript.
 * @returns {Promise<Array>} - Resolves to an array of stream events.
 */
export async function runWithTranscript(initialTranscript) {
  // Generate detailed tool descriptions for the system prompt
  const toolDescriptions = tools.map(tool => `- ${tool.name}: ${tool.description}`).join("\n");

  // Initialize state with the provided transcript.
  const initialState = {
  messages: [
    { role: "system", content: `You are a helpful assistant. You have the following tools available. Use them when appropriate based on the user's request:\n${toolDescriptions}` },
    { role: "user", content: initialTranscript  }
  ],
};

  // Stream events from the workflow.
  const eventStream = app3.streamEvents(
    initialState,
    { version: "v2" }
  );

  const events = [];
  for await (const event of eventStream) {
    console.log(event);
    events.push(event);
  }

  console.log(`Received ${events.length} events from the nested function`);
  return events;
}