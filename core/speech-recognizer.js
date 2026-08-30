class SpeechRecognizer {
  constructor() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    this.recognition = new SpeechRecognition();
    this.isListening = false;
    this.transcript = '';
    this.interim = '';

    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.recognition.onstart = () => {
      this.isListening = true;
      this.onStatusChange?.('listening');
    };

    this.recognition.onresult = (event) => {
      this.interim = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          this.transcript += transcript + ' ';
        } else {
          this.interim += transcript;
        }
      }

      this.onTranscriptChange?.(this.transcript, this.interim);
    };

    this.recognition.onerror = (event) => {
      this.onError?.(event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.onStatusChange?.('stopped');
    };
  }

  start() {
    this.transcript = '';
    this.interim = '';
    this.recognition.start();
  }

  stop() {
    this.recognition.stop();
  }

  setLanguage(lang) {
    this.recognition.lang = lang;
  }

  getTranscript() {
    return this.transcript.trim();
  }
}

