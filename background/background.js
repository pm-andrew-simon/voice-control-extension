console.log('Background worker started');

// Общий promise на случай, если несколько вызовов ensureOffscreenDocument
// произойдут одновременно - не пытаемся создать документ дважды параллельно
let creatingOffscreenPromise = null;

function ensureOffscreenDocument() {
  if (creatingOffscreenPromise) {
    return creatingOffscreenPromise;
  }

  creatingOffscreenPromise = (async () => {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT']
    });

    if (contexts.length > 0) {
      console.log('Offscreen document already exists');
      return;
    }

    console.log('Creating offscreen document...');
    await chrome.offscreen.createDocument({
      url: 'offscreen/offscreen.html',
      reasons: ['USER_MEDIA'],
      justification: 'Recording microphone audio for voice command recognition'
    });
    console.log('Offscreen document created successfully!');
  })().finally(() => {
    creatingOffscreenPromise = null;
  });

  return creatingOffscreenPromise;
}

// Выполняет реальное действие в браузере по распознанной команде
async function handleCommand(command) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    throw new Error('No active tab found');
  }

  console.log('Executing command:', command, 'on tab', tab.id);

  switch (command) {
    case 'scrollDown':
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.scrollBy({ top: 500, behavior: 'smooth' })
      });
      break;

    case 'scrollUp':
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.scrollBy({ top: -500, behavior: 'smooth' })
      });
      break;

    case 'goBack':
      await chrome.tabs.goBack(tab.id);
      break;

    case 'goForward':
      await chrome.tabs.goForward(tab.id);
      break;

    case 'newTab':
      await chrome.tabs.create({});
      break;

    case 'closeTab':
      await chrome.tabs.remove(tab.id);
      break;

    default:
      console.warn('Unknown command:', command);
  }
}

// Создаём заранее (best effort) - но popup всё равно должен дождаться
// подтверждения перед отправкой сообщений, поэтому есть обработчик ниже
ensureOffscreenDocument().catch((error) => {
  console.error('Failed to create offscreen document on load:', error);
});

chrome.runtime.onStartup.addListener(() => {
  console.log('Extension startup, ensuring offscreen document...');
  ensureOffscreenDocument().catch((error) => {
    console.error('Failed to create offscreen document on startup:', error);
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'ensureOffscreen') {
    ensureOffscreenDocument()
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // асинхронный ответ
  }

  if (request.type === 'executeCommand') {
    handleCommand(request.command)
      .then(() => sendResponse({ success: true }))
      .catch((error) => {
        console.error('Failed to execute command:', request.command, error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // асинхронный ответ
  }
});
