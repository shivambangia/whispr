import { graph } from "./langchain/agent_graph.js";

export async function handleUserInput(userMessageContent) {
  // Construct the input dynamically using the provided message content.
  const initiateState = {
      messages: userMessageContent,
  };

  const config = {
    configurable: {
      thread_id: "stream_events",
    },
    version: "v2",
  };

  const stream = graph.streamEvents(
    initiateState,
    { version: "v2" },
    { includeNames: ["nested"] }
  );

  for await (const event of stream) {
    console.dir(
      {
        event: event.event,
        data: event.data,
      },
      { depth: 3 }
    );
    lastEventData = event.data;
  }

  return lastEventData;
}