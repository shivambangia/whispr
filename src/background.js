import {agentGraph} from "./langchain/agent_graph"; 

console.log("Background service worker started.");


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "PROCESS_TRANSCRIPT") {
        const transcript = message.payload;
        console.log("Background: Received transcript:", transcript);

        // Indicate processing started (optional feedback to popup)
         if (sender.tab?.id) {
            chrome.tabs.sendMessage(sender.tab.id, { type: "STATUS_UPDATE", payload: "Analyzing request..." });
         }

         const initialState = {
            input: transcript,
            intermediate_steps: [], // Start with no history/steps
            chat_history: [], // Initialize if using history
        };

        // Use an async IIFE (Immediately Invoked Function Expression) to handle the async agent logic
        (async () => {
            try {
                // Prepare the initial state for the graph
                console.log("Background: Invoking LangGraph agent...");
                // Stream events (optional, good for debugging)
                // const stream = await agentGraph.stream(initialState);
                // for await (const event of stream) {
                //      console.log("Graph Event:", event);
                //       // You could potentially send finer-grained status updates here
                // }
                // OR just invoke and wait for the final state
                    const finalState = await agentGraph.invoke(initialState);

                console.log("Background: LangGraph execution finished. Final State:", finalState);

                 // Send final status update back to the specific popup tab that sent the message
                 if (sender.tab?.id) {
                     chrome.tabs.sendMessage(sender.tab.id, { type: "STATUS_UPDATE", payload: responseMessage });
                 }
            } catch (error) {
                console.error("Background: Error processing transcript with LangGraph:", error);
                // Send an error response back to the popup
                const errorMessage = `Error: ${error.message || 'Failed to process request.'}`;
                 sendResponse({ success: false, message: errorMessage });
                  // Send final error status update back to the specific popup tab
                 if (sender.tab?.id) {
                    chrome.tabs.sendMessage(sender.tab.id, { type: "STATUS_UPDATE", payload: errorMessage });
                 }
            }
        })();

        // Return true to indicate that sendResponse will be called asynchronously
        return true;
    }

    // Handle other message types if needed
    // return false; // if not handling the message or responding synchronously
});

