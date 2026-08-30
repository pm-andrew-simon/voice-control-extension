console.log('Popup loaded!');

document.addEventListener('DOMContentLoaded', async () => {
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const statusDiv = document.getElementById('status');
  const transcriptDiv = document.getElementById('transcript');
  const langSelect = document.getElementById('langSelect');

  // Убеждаемся что offscreen document точно существует, прежде
  // чем слать ему любые сообщения. Без этого возможна гонка состояний:
  // popup может открыться быстрее, чем background успеет его создать.
  async function ensureOffscreenReady() {
    try {
      await chrome.runtime.sendMessage({ type: 'ensureOffscreen' });
    } catch (error) {
      console.log('ensureOffscreen ping failed:', error);
    }
  }

  // Вспомогательная функция: применить статус к UI
  function applyStatus(status) {
    const isListening = status === 'listening';
    if (isListening) {
      statusDiv.textContent = '🔴 Listening...';
      statusDiv.className = 'status listening';
    } else {
      statusDiv.textContent = '⚪ Ready';
      statusDiv.className = 'status';
    }
    startBtn.disabled = isListening;
    stopBtn.disabled = !isListening;
    langSelect.disabled = isListening;
  }

  // ШАГ 0: гарантируем что offscreen готов
  await ensureOffscreenReady();

  // ШАГ 1: восстанавливаем сохранённый язык и ЯВНО сообщаем его offscreen.
  // Мы не полагаемся на то, что offscreen сам прочитает chrome.storage -
  // в некоторых средах это API там недоступно. Popup - источник истины.
  try {
    const stored = await chrome.storage.sync.get('language');
    const savedLang = stored.language || 'en-US';
    langSelect.value = savedLang;
    console.log('Restored language preference:', savedLang);

    await chrome.runtime.sendMessage({ type: 'setLanguage', lang: savedLang });
    console.log('Applied restored language to offscreen:', savedLang);
  } catch (error) {
    console.log('Could not load/apply language preference:', error);
  }

  // ШАГ 2: спрашиваем offscreen про текущее состояние (start/stop sync)
  try {
    console.log('Requesting current status from offscreen...');
    const status = await chrome.runtime.sendMessage({ type: 'getStatus' });
    console.log('Initial status:', status);

    if (status && status.success) {
      applyStatus(status.isListening ? 'listening' : 'stopped');

      if (status.transcript || status.interim) {
        transcriptDiv.innerHTML = `
          <div class="final">${status.transcript}</div>
          <div class="interim">${status.interim}</div>
        `;
      }
    }
  } catch (error) {
    console.log('Could not get initial status:', error);
    applyStatus('stopped');
  }

  // Слушаем сообщения ОТ offscreen (пока popup открыт)
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Popup received from offscreen:', request.type, request);

    if (request.type === 'statusChanged') {
      applyStatus(request.status);
    }
    else if (request.type === 'transcriptChanged') {
      transcriptDiv.innerHTML = `
        <div class="final">${request.final}</div>
        <div class="interim">${request.interim}</div>
      `;
    }
    else if (request.type === 'errorOccurred') {
      console.error('Recognizer error:', request.error);
      if (request.error === 'not-allowed') {
        statusDiv.innerHTML = `❌ Нет доступа к микрофону. <a href="#" id="openOptions">Разрешить →</a>`;
        document.getElementById('openOptions').addEventListener('click', (e) => {
          e.preventDefault();
          chrome.runtime.openOptionsPage();
        });
      } else {
        statusDiv.textContent = `❌ Error: ${request.error}`;
      }
      startBtn.disabled = false;
      stopBtn.disabled = true;
      langSelect.disabled = false;
    }
  });

  // Переключение языка
  langSelect.addEventListener('change', async () => {
    const lang = langSelect.value;
    console.log('Language changed to:', lang);

    await chrome.storage.sync.set({ language: lang });

    await ensureOffscreenReady();
    try {
      await chrome.runtime.sendMessage({ type: 'setLanguage', lang: lang });
      console.log('Language applied in offscreen');
    } catch (error) {
      console.error('Could not apply language:', error);
    }
  });

  // Кнопка "Start Listening"
  startBtn.addEventListener('click', async () => {
    console.log('Start button clicked - sending to offscreen');
    await ensureOffscreenReady();
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'startListening'
      });
      console.log('Response from offscreen:', response);
      if (response && response.success) {
        applyStatus('listening');
      }
    } catch (error) {
      console.error('Error:', error);
      statusDiv.textContent = `❌ Error: ${error.message}`;
    }
  });

  // Кнопка "Stop Listening"
  stopBtn.addEventListener('click', async () => {
    console.log('Stop button clicked - sending to offscreen');
    await ensureOffscreenReady();
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'stopListening'
      });
      console.log('Response from offscreen:', response);
      if (response && response.success) {
        applyStatus('stopped');
      }
    } catch (error) {
      console.error('Error:', error);
      statusDiv.textContent = `❌ Error: ${error.message}`;
    }
  });
});
