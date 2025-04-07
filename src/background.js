import {runWithTranscript} from "./langchain/agent_graph"; 

console.log("Background service worker started.");

const invokeGraph = async (transcript) => {
      console.log("Background: Invoking LangGraph agent...");
  
      try{
        const finalState = await runWithTranscript(transcript);
        console.log(finalState)
      }
      catch(error){
        console.log("it's an error folks")
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

