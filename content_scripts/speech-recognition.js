const startBtn = document.getElementById('startBtn');
const output = document.getElementById('output');

const recognition = new SpeechRecognition();
recognition.continuous = false;
recognition.interimResults = false;
recognition.lang = 'en-US';


startBtn.onclick = () => {
    recognition.start();
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    output.textContent = transcript;
  };

  recognition.onerror = (event) => {
    output.textContent = 'Error: ' + event.error;
  };
  
