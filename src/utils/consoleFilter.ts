// Консольный / stdout фильтр для подавления огромного XML (getPageSource) в терминале.
// ВАЖНО: теперь строго включается ТОЛЬКО если QUIET_UI_XML === '1'.
// Документация: добавьте перед запуском `QUIET_UI_XML=1` (bash) или `set QUIET_UI_XML=1` (cmd / Powershell -> `$env:QUIET_UI_XML=1`).
// Мы перехватываем:
//  1) console.log|warn|error (если кто-то вручную выводит XML)
//  2) process.stdout.write / process.stderr.write (WebdriverIO INFO webdriver: RESULT ... <hierarchy ... > приходит сюда напрямую)
// Критерии подавления:
//  - chunk или строка содержит "<hierarchy" И длина > 2000 символов
//  - либо содержит 50+ вхождений com.horcrux.svg (SVG-дерево)
// Поведение:
//  - Первый раз выводим одиночную заглушку [consoleFilter] ... и счетчик подавленных блоков по завершению процесса.

const ENABLED = process.env.QUIET_UI_XML !== '0';

if (ENABLED) {
  const origLog = console.log;
  const origWarn = console.warn;
  const origError = console.error;
  const origStdoutWrite = process.stdout.write.bind(process.stdout);
  const origStderrWrite = process.stderr.write.bind(process.stderr);

  let suppressedBlocks = 0;
  let notified = false;

  function shouldSuppressText(text: string): boolean {
    if (!text) return false;
    if (text.length < 2000) return false; // быстрый отсев
    if (text.includes('<hierarchy') || text.includes('</hierarchy>')) return true;
    const svgCount = (text.match(/com\.horcrux\.svg/gi) || []).length;
    if (svgCount > 50) return true;
    return false;
  }

  function notifyOnce() {
    if (!notified) {
      notified = true;
      origLog('[consoleFilter] Включено QUIET_UI_XML=1 — большие XML (pageSource) подавляются.');
    }
  }

  function onSuppress() {
    suppressedBlocks++;
  }

  function wrapConsole(fn: (...a: any[]) => void) {
    return (...args: any[]) => {
      if (args.length === 1 && typeof args[0] === 'string' && shouldSuppressText(args[0])) {
        notifyOnce();
        onSuppress();
        return; // глушим
      }
      fn(...args);
    };
  }

  console.log = wrapConsole(origLog);
  console.warn = wrapConsole(origWarn);
  console.error = wrapConsole(origError);

  // Буферы для stdout/stderr (вдруг XML приходит порциями). Будем искать маркер <hierarchy.
  let stdoutBuffer = '';
  let stderrBuffer = '';

  function flushStd(buffer: string, writeFn: (chunk: any, encoding?: any, cb?: any) => boolean) {
    if (!buffer) return;
    if (shouldSuppressText(buffer)) {
      notifyOnce();
      onSuppress();
      return; // полностью пропускаем вывод этого буфера
    }
    writeFn(buffer);
  }

  function handleChunk(kind: 'out' | 'err', chunk: any, encoding?: any, cb?: any) {
    try {
      const text = typeof chunk === 'string' ? chunk : chunk?.toString?.(encoding || 'utf8');
      if (typeof text !== 'string')
        return (kind === 'out' ? origStdoutWrite : origStderrWrite)(chunk, encoding, cb);

      // Накапливаем пока не встретим перевод строки. XML обычно приходит одним большим куском, но на всякий случай.
      if (kind === 'out') stdoutBuffer += text;
      else stderrBuffer += text;

      const bufferRef = kind === 'out' ? stdoutBuffer : stderrBuffer;
      // Если в буфере есть конец XML ( </hierarchy> или очень большой размер > 500k ), пытаемся обработать.
      if (bufferRef.includes('</hierarchy>') || bufferRef.length > 500_000) {
        if (kind === 'out') {
          const toFlush = stdoutBuffer;
          stdoutBuffer = '';
          flushStd(toFlush, origStdoutWrite);
        } else {
          const toFlush = stderrBuffer;
          stderrBuffer = '';
          flushStd(toFlush, origStderrWrite);
        }
      } else if (bufferRef.includes('\n') && !bufferRef.includes('<hierarchy')) {
        // Если это обычные строки без XML — сбрасываем сразу чтобы не задерживать логи.
        if (kind === 'out') {
          const toFlush = stdoutBuffer;
          stdoutBuffer = '';
          origStdoutWrite(toFlush);
        } else {
          const toFlush = stderrBuffer;
          stderrBuffer = '';
          origStderrWrite(toFlush);
        }
      }
    } catch (e) {
      // В случае ошибки не блокируем вывод
      return (kind === 'out' ? origStdoutWrite : origStderrWrite)(chunk, encoding, cb);
    }
  }

  (process.stdout as any).write = (chunk: any, encoding?: any, cb?: any) =>
    handleChunk('out', chunk, encoding, cb);
  (process.stderr as any).write = (chunk: any, encoding?: any, cb?: any) =>
    handleChunk('err', chunk, encoding, cb);

  // По завершению процесса логируем сколько блоков подавили.
  process.on('exit', () => {
    if (notified) {
      origLog(`[consoleFilter] Подавлено больших XML блоков: ${suppressedBlocks}.`);
    }
  });
}
