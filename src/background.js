import {runWithTranscript} from "./langchain/agent_graph.js"; 
import { contentScript } from "./content_script.js";

console.log("Background service worker started.");

const invokeGraph = async (transcript, sendResponse) => {
      console.log("Background: Invoking LangGraph agent with transcript:", transcript);
      try{
        const events = await runWithTranscript(transcript);
        console.log("Background: LangGraph finished successfully.");
        sendResponse({ success: true, message: "Processing complete." });
      }
      catch(error){
        console.error("Background: Error invoking LangGraph:", error);
        sendResponse({ success: false, message: `Error: ${error.message || 'Unknown error'}` });
      }
  };

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "PROCESS_TRANSCRIPT") {
        const transcript = message.payload;
        console.log("Background: Received transcript:", transcript);
        invokeGraph(transcript, sendResponse);
        return true;
    }
    return false;
});

