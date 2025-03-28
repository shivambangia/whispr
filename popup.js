window.onload = () => {
    console.log("🔥 popup.js is loaded");
  
    const btn = document.getElementById('startBtn');
    const output = document.getElementById('output');
  
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
  
      btn.onclick = () => {
        console.log("shivam");
        try {
          recognition.start();
        } catch (err) {
          console.error("🔥 Error calling start():", err);
          output.value = "Caught Error: " + err.message;
        }
      };
  
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        output.value = transcript; // since `output` is a textarea
      };
  
      recognition.onerror = (event) => {
        console.log(event.message);
        output.value = 'Error: ' + event.error;
      };
    } else {
      console.error("SpeechRecognition not supported");
    }
  };