// Простой парсер голосовых команд.
// Берёт распознанную фразу и решает, является ли она известной командой.
// Работает через сравнение последовательности слов, а не regex \b -
// так надёжнее для кириллицы.

const COMMAND_PATTERNS = [
  { command: 'scrollDown', phrases: ['scroll down', 'page down', 'скролл вниз', 'прокрути вниз', 'вниз'] },
  { command: 'scrollUp',   phrases: ['scroll up', 'page up', 'скролл вверх', 'прокрути вверх', 'вверх'] },
  { command: 'goBack',     phrases: ['go back', 'back', 'назад'] },
  { command: 'goForward',  phrases: ['go forward', 'forward', 'вперёд', 'вперед'] },
  { command: 'newTab',     phrases: ['open new tab', 'new tab', 'открой новую вкладку', 'новая вкладка'] },
  { command: 'closeTab',   phrases: ['close tab', 'закрой вкладку'] },
];

function containsPhrase(words, phrase) {
  const phraseWords = phrase.split(' ');
  for (let i = 0; i <= words.length - phraseWords.length; i++) {
    if (phraseWords.every((w, j) => words[i + j] === w)) {
      return true;
    }
  }
  return false;
}

function parseCommand(rawText) {
  const text = rawText.trim().toLowerCase().replace(/[.,!?]/g, '');
  if (!text) return null;

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;

  for (const { command, phrases } of COMMAND_PATTERNS) {
    for (const phrase of phrases) {
      if (containsPhrase(words, phrase)) {
        return command;
      }
    }
  }

  return null;
}
