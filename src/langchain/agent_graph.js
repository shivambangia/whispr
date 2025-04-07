import { END, START, StateGraph, Annotation } from "@langchain/langgraph/web";
import { HumanMessage } from "@langchain/core/messages";
import { RunnableLambda } from "@langchain/core/runnables";

// Define the root state with a messages array and a reducer to concatenate messages.
const GraphState3 = Annotation.Root({
  messages: Annotation({
    reducer: (x, y) => x.concat(y),
  }),
});

// Define the node function. This function uses a nested function to produce a response.
const nodeFn3 = async (_state, config) => {
  // Create the nested function which returns a HumanMessage.
  const nestedFn = RunnableLambda.from(
    async (input, _config) => {
      return new HumanMessage(`Hello from ${input}!`);
    }
  ).withConfig({ runName: "nested" });

  // Invoke the nested function.
  const responseMessage = await nestedFn.invoke("a nested function", config);
  return { messages: [responseMessage] };
};

// Build the state graph with a single node.
const workflow3 = new StateGraph(GraphState3)
  .addNode("node", nodeFn3)
  .addEdge(START, "node")
  .addEdge("node", END);

// Compile the graph to create an executable application.
const app3 = workflow3.compile({});

/**
 * Runs the langgraph workflow with an initial transcript.
 * 
 * @param {Array} initialTranscript - An array of messages that form the initial transcript.
 * @returns {Promise<Array>} - Resolves to an array of stream events.
 */
export async function runWithTranscript(initialTranscript) {
  // Initialize state with the provided transcript.
  const initialState = { messages: initialTranscript };

  // Stream events from the workflow.
  const eventStream = app3.streamEvents(
    initialState,
    { version: "v2" },
    { includeNames: ["nested"] }
  );

  const events = [];
  for await (const event of eventStream) {
    console.log(event);
    events.push(event);
  }

  console.log(`Received ${events.length} events from the nested function`);
  return events;
}