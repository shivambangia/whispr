// langchain/agent_graph.js
// Ensure you have installed necessary packages:
// npm install langchain @langchain/core @langchain/langgraph @langchain/openai langchainhub

import { Tool } from "@langchain/core/tools";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { RunnableWithMessageHistory } from "@langchain/core/runnables"; // If needed for history
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents"; // Using OpenAI Functions agent
import { convertToLangChainMessages } from "@langchain/core/messages"; // Utility for history
import { StringOutputParser } from "@langchain/core/output_parsers"; // Basic parser

// LangGraph specific imports
import { StateGraph, END } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt"; // Prebuilt node for executing tools

// Internal imports
import { getLLM } from './llm_setup.js';
import { availableTools } from './tools.js'; // Import the tool instances

// --- 1. Define Agent State ---
// Represents the information flowing through the graph
const agentState = {
    input: null, // The initial user transcript
    agent_outcome: null, // The decision from the agent (Action or FinalAnswer)
    intermediate_steps: [], // List of (action, observation) pairs from tool calls
    // chat_history: [], // Optional: for conversational memory
};

// --- 2. Setup LLM, Prompt, and Agent ---
const llm = getLLM(); // Get the configured LLM instance

// You might need to pull a prompt from LangChain Hub or define your own
// Example defining a basic prompt for OpenAI Functions Agent
const prompt = ChatPromptTemplate.fromMessages([
    ["system", "You are a helpful assistant interacting with browser tools based on user speech. Use the provided tools when appropriate. Respond concisely."],
    // new MessagesPlaceholder("chat_history"), // Uncomment if using chat history
    ["human", "{input}"],
    new MessagesPlaceholder("agent_scratchpad"), // Crucial for agent intermediate steps
]);

// Create the Agent - OpenAI Functions agent is good at tool calling
const agentRunnable = await createOpenAIFunctionsAgent({
    llm,
    tools: availableTools,
    prompt,
});

// --- 3. Define Graph Nodes ---

// Node that runs the agent logic
const runAgentNode = async (state) => {
    console.log("Graph: Running Agent Node");
    const agentOutcome = await agentRunnable.invoke({
        input: state.input,
        intermediate_steps: state.intermediate_steps,
        // chat_history: state.chat_history || [], // Pass history if using
    });
    console.log("Graph: Agent Outcome:", agentOutcome);
    return {
        agent_outcome: agentOutcome,
    };
};

// Node that executes the chosen tool (using LangGraph's prebuilt ToolNode)
// It expects state.agent_outcome to contain the AgentAction object
const executeToolsNode = new ToolNode(availableTools);

// --- 4. Define Graph Edges (Conditional Logic) ---

// Function to determine the next step after the agent runs
const shouldContinue = (state) => {
    console.log("Graph: Evaluating Agent Outcome");
    // If the agent generated a tool call (AgentAction), execute the tool
    if (state.agent_outcome && Array.isArray(state.agent_outcome) && state.agent_outcome[0]?.tool) { // Check specific structure for tool calls
         console.log("Graph: Decision -> Continue (Execute Tool)");
        return "continue"; // The name of the edge leading to the tool execution node
    }
    // Otherwise, the agent provided a final response (AgentFinish)
     console.log("Graph: Decision -> End");
    return "end"; // The name of the edge leading to the end state
};


// --- 5. Construct the Graph ---

const workflow = new StateGraph({
    channels: agentState, // Define the structure of the state
});

// Add nodes
workflow.addNode("agent", runAgentNode);       // Node to run the core agent logic
workflow.addNode("action", executeToolsNode); // Node to run the chosen tool

// Define edges
workflow.setEntryPoint("agent"); // Start with the agent node

// Conditional edge from agent: either continue to tool or end
workflow.addConditionalEdges(
    "agent",        // Source node
    shouldContinue, // Function to decide the path
    {
        "continue": "action", // If shouldContinue returns "continue", go to "action" node
        "end": END,           // If shouldContinue returns "end", finish the graph execution
    }
);

// Edge from action node back to agent node (always loop back after tool execution)
workflow.addEdge("action", "agent");

// --- 6. Compile the Graph ---

export const agentGraph = workflow.compile(); // Compile the graph into a runnable object

console.log("LangGraph agent compiled successfully.");

// Optional: Helper function to format the final output (if needed)
export function formatFinalResponse(finalState) {
    if (finalState?.agent_outcome?.returnValues?.output) {
        return finalState.agent_outcome.returnValues.output;
    } else if (finalState?.intermediate_steps?.length > 0) {
        // Return the result of the last tool call if no final LLM response
        return finalState.intermediate_steps[finalState.intermediate_steps.length - 1][1]; // Get the observation (tool result)
    }
     else if (typeof finalState?.agent_outcome === 'string') { // Handle direct string output? Less common with function agents
         return finalState.agent_outcome;
    }
    return "Processing complete, but no specific response generated."; // Default fallback
}