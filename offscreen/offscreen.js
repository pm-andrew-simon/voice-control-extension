let recognizer;
let lastProcessedFinalLength = 0;

console.log('Offscreen document loaded!');

// Создаём распознаватель - не зависит ни от каких chrome.* API
recognizer = new SpeechRecognizer();
console.log('SpeechRecognizer created successfully');

// Обработчик изменения статуса
recognizer.onStatusChange = (status) => {
  console.log('Offscreen: status changed -', status);
  chrome.runtime.sendMessage({
    type: 'statusChanged',
    status: status
  }).catch(err => console.log('Could not send status:', err));
};

// Обработчик изменения текста (ГЛАВНЫЙ!)
recognizer.onTranscriptChange = (final, interim) => {
  console.log('Offscreen: transcript updated');
  chrome.runtime.sendMessage({
    type: 'transcriptChanged',
    final: final,
    interim: interim
  }).catch(err => console.log('Could not send transcript:', err));

  // Проверяем, не появился ли новый кусок ФИНАЛЬНОГО текста -
  // если да, пробуем распознать в нём голосовую команду
  if (final.length > lastProcessedFinalLength) {
    const newPhrase = final.slice(lastProcessedFinalLength);
    lastProcessedFinalLength = final.length;

    const command = parseCommand(newPhrase);
    if (command) {
      console.log('Offscreen: detected command ->', command, 'from phrase:', newPhrase);
      chrome.runtime.sendMessage({
        type: 'executeCommand',
        command: command
      }).catch(err => console.log('Could not send command:', err));
    }
  }
};

// Обработчик ошибок
recognizer.onError = (error) => {
  console.log('Offscreen: error -', error);
  chrome.runtime.sendMessage({
    type: 'errorOccurred',
    error: error
  }).catch(err => console.log('Could not send error:', err));
};

// КРИТИЧНО: регистрируем обработчик сообщений СРАЗУ, ничего не должно
// помешать этой строке выполниться - иначе popup не сможет достучаться
// до offscreen вообще никакими сообщениями.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Offscreen received:', request.type);

  if (request.type === 'startListening') {
    console.log('Offscreen: starting recognition');
    lastProcessedFinalLength = 0;
    recognizer.start();
    sendResponse({ success: true });
  }
  else if (request.type === 'stopListening') {
    console.log('Offscreen: stopping recognition');
    recognizer.stop();
    sendResponse({ success: true });
  }
  else if (request.type === 'setLanguage') {
    console.log('Offscreen: setting language to', request.lang);
    recognizer.setLanguage(request.lang);
    sendResponse({ success: true });
  }
  else if (request.type === 'getStatus') {
    console.log('Offscreen: reporting current status - isListening:', recognizer.isListening);
    sendResponse({
      success: true,
      isListening: recognizer.isListening,
      transcript: recognizer.getTranscript(),
      interim: recognizer.interim
    });
  }
});

console.log('Offscreen message listener registered');

// Язык применяется НЕ здесь, а по явной команде от popup (setLanguage).
// В offscreen document chrome.storage недоступен в этой среде, поэтому
// popup.js - единственный источник истины про выбранный язык, и он
// присылает setLanguage при каждом своём открытии.
