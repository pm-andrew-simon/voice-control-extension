document.getElementById('grantBtn').addEventListener('click', async () => {
  const statusDiv = document.getElementById('status');
  console.log('Requesting microphone permission...');

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log('Microphone permission granted!');

    // Останавливаем поток - он нам нужен был только чтобы получить разрешение
    stream.getTracks().forEach(track => track.stop());

    statusDiv.textContent = '✅ Микрофон разрешён! Можно закрыть эту вкладку и пользоваться расширением.';
    statusDiv.className = 'success';
  } catch (error) {
    console.error('Microphone permission denied:', error);
    statusDiv.textContent = `❌ Ошибка: ${error.message}`;
    statusDiv.className = 'error';
  }
});
