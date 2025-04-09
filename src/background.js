import {runWithTranscript} from "./langchain/agent_graph.js"; 

console.log("Background service worker started.");

const invokeGraph = async (transcript) => {
      console.log("Background: Invoking LangGraph agent...");
      try{
        const result = await runWithTranscript("bookmark this page");
        console.log(result)
      }
      catch(error){
        console.log(error)
      }
  };

chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.type === "PROCESS_TRANSCRIPT") {
        const transcript = message.payload;
        console.log("Background: Received transcript:", transcript);
        invokeGraph(transcript)
        // Return true to indicate that sendResponse will be called asynchronously
        return true;
    }
});

