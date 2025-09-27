/**
 * Хелпер восстановления состояния приложения между тестами,
 * если предыдущий тест упал и оставил приложение в "грязном" состоянии.
 */

import { resetAppStateFlags } from './appState';

let previousTestFailed = false;

/** Вспомогательная функция для отладки в хуках (не использовать в проде). */
export function wasPreviousTestFailed() {
  return previousTestFailed;
}

type RecoverStrategy = 'restart' | 'clear-data' | 'reinstall';

/** Отчёт о том что старт не дал ожидаемый онбординг/логин вовремя */
function resolveStrategy(): RecoverStrategy {
  const raw = (process.env.RECOVER_STRATEGY || 'clear-data').toLowerCase();
  if (raw === 'clear-data' || raw === 'reinstall' || raw === 'restart') return raw;
  console.warn(`[recovery] Неизвестная RECOVER_STRATEGY="${raw}" — использую clear-data`);
  return 'clear-data';
}

/** Отметить результат теста (вызывать из afterTest). */
export function markTestResult(passed: boolean) {
  const before = previousTestFailed;
  if (!passed) {
    previousTestFailed = true;
    console.warn(
      `[recovery][markTestResult] Тест упал -> previousTestFailed=true (было ${before})`,
    );
  } else {
    // Явно логируем успешный тест для наглядной трассировки
    console.log(
      '[recovery][markTestResult] Тест прошёл успешно (previousTestFailed останется',
      before,
      ')',
    );
  }
}

/** Сброс флага вручную (редко нужно). */
export function resetFailureFlag() {
  previousTestFailed = false;
}

/**
 * Если предыдущий тест упал — пытаемся полностью перезапустить приложение
 * чтобы следующий тест начал с чистого стартового экрана.
 *
 * Порядок действий:
 * 1. terminateApp(appPackage)
 * 2. маленькая пауза
 * 3. activateApp(appPackage) (или launchApp как fallback)
 * 4. опционально: reinstall (если activate не удалось и есть apk)
 */
export async function ensureCleanStateIfPreviousFailed(appPackage: string, apkPath?: string) {
  if (!previousTestFailed) {
    console.log('[recovery] Пропуск: previousTestFailed=false — восстановление не требуется');
    return;
  }
  if (process.env.RECOVER_PREV_FAIL === 'false') {
    console.warn('[recovery] Пропуск (RECOVER_PREV_FAIL=false)');
    previousTestFailed = false;
    return;
  }
  const forceReinstall = process.env.RECOVER_FORCE_REINSTALL === 'true';
  const strategy = resolveStrategy();
  if (forceReinstall) {
    console.warn(
      '[recovery] Предыдущий тест упал — форсируем reinstall (RECOVER_FORCE_REINSTALL=true)',
    );
  } else {
    console.warn(`[recovery] Предыдущий тест упал — стратегия: ${strategy}`);
  }

  try {
    if (forceReinstall) {
      await strategyReinstall(appPackage, apkPath, true);
    } else if (strategy === 'clear-data') {
      await strategyClearData(appPackage);
    } else if (strategy === 'reinstall') {
      await strategyReinstall(appPackage, apkPath, false);
    } else {
      // restart
      await strategyRestart(appPackage, apkPath);
    }
  } catch (e) {
    console.warn('[recovery] Ошибка в стратегии восстановления:', (e as Error).message);
  }

  // Верификация: убедимся что не остались на Launcher
  let activity: string | undefined;
  let curPackage: string | undefined;
  try {
    // @ts-ignore
    activity = await driver.getCurrentActivity?.();
    // @ts-ignore
    curPackage = await driver.getCurrentPackage?.();
    if (activity) console.warn('[recovery] post-strategy activity=', activity);
    if (curPackage) console.warn('[recovery] post-strategy package=', curPackage);
  } catch (e) {
    console.warn('[recovery] Не удалось получить текущую activity/package:', (e as Error).message);
  }
  const looksBad =
    !activity ||
    /launcher/i.test(activity) ||
    activity.includes('LauncherActivity') ||
    curPackage !== appPackage;
  if (looksBad) {
    console.warn(
      '[recovery] Предупреждение: приложение не запущено корректно после восстановления (activity=' +
        activity +
        ', package=' +
        curPackage +
        '). Доп. попытка запуска.',
    );
    try {
      const mainActivityEnv =
        process.env.RECOVER_MAIN_ACTIVITY ||
        process.env.APP_ACTIVITY ||
        'com.fin.whiteswan.MainActivity';
      const adb = buildAdbCommand();
      let spec: string;
      if (mainActivityEnv.startsWith('.')) spec = `${appPackage}/${appPackage}${mainActivityEnv}`;
      else if (mainActivityEnv.includes(appPackage)) spec = `${appPackage}/${mainActivityEnv}`;
      else spec = `${appPackage}/${appPackage}.${mainActivityEnv}`;
      await execShell(`${adb} shell am start -n ${spec}`);
      await postStartWait('retry-start');
      // @ts-ignore
      activity = await driver.getCurrentActivity?.();
      // @ts-ignore
      curPackage = await driver.getCurrentPackage?.();
      console.warn('[recovery] После retry-start activity=', activity, 'package=', curPackage);
    } catch (e) {
      console.warn('[recovery] Дополнительный запуск не удался:', (e as Error).message);
    }
  }
  if (activity && !/launcher/i.test(activity) && curPackage === appPackage) {
    console.warn('[recovery] Завершено выполнение стратегии — сбрасываю previousTestFailed=false');
    previousTestFailed = false;
    // Сбрасываем состояние онбординга, так как приложение было перезапущено
    resetAppStateFlags();
    console.warn('[recovery] Состояние онбординга сброшено - потребуется повторная обработка');
  } else {
    console.warn(
      '[recovery] previousTestFailed оставлен true — повторная попытка восстановления будет выполнена в следующем beforeTest',
    );
  }
}

function pause(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function strategyRestart(appPackage: string, apkPath?: string) {
  console.warn('[recovery] Выполняю restart');
  try {
    // @ts-ignore
    await driver.terminateApp(appPackage);
  } catch (e) {
    console.warn('[recovery] terminateApp не удалось (игнорирую):', (e as Error).message);
  }
  await pause(1000);
  let started = false;
  try {
    // @ts-ignore
    await driver.activateApp(appPackage);
    started = true;
  } catch (e) {
    console.warn('[recovery] activateApp не удалось, пробую launchApp:', (e as Error).message);
  }
  if (!started) {
    try {
      // @ts-ignore
      await driver.launchApp();
      started = true;
    } catch (e) {
      console.warn('[recovery] launchApp не удалось:', (e as Error).message);
    }
  }
  if (!started && apkPath && apkPath.endsWith('.apk')) {
    console.warn('[recovery] Fallback: переустановка apk');
    try {
      // @ts-ignore
      await driver.installApp(apkPath);
      // @ts-ignore
      await driver.activateApp(appPackage);
      started = true;
    } catch (e) {
      console.warn('[recovery] Переустановка не помогла:', (e as Error).message);
    }
  }
  await postStartWait('restart');
  if (started) console.warn('[recovery] restart завершён');
  else console.warn('[recovery] restart не удался');
}

async function strategyClearData(appPackage: string) {
  console.warn('[recovery] Выполняю clear-data (force-stop + pm clear + startActivity)');
  const adb = buildAdbCommand();
  // 1. На всякий случай принудительно останавливаем
  try {
    await execShell(`${adb} shell am force-stop ${appPackage}`);
  } catch (e) {
    console.warn('[recovery] force-stop не удалось (игнор):', (e as Error).message);
  }
  // 2. pm clear
  try {
    await execShell(`${adb} shell pm clear ${appPackage}`);
  } catch (e) {
    console.warn('[recovery] pm clear не удалось:', (e as Error).message);
  }
  // 3. Явный старт главной Activity (если указана)
  const mainActivityRaw =
    process.env.RECOVER_MAIN_ACTIVITY ||
    process.env.APP_ACTIVITY ||
    'com.fin.whiteswan.MainActivity';
  let startSpec: string | null = null;
  if (mainActivityRaw) {
    if (mainActivityRaw.startsWith('.'))
      startSpec = `${appPackage}/${appPackage}${mainActivityRaw}`;
    else if (mainActivityRaw.includes(appPackage)) startSpec = `${appPackage}/${mainActivityRaw}`;
    else startSpec = `${appPackage}/${appPackage}.${mainActivityRaw}`;
  }
  let started = false;
  if (startSpec) {
    try {
      await execShell(`${adb} shell am start -n ${startSpec}`);
      started = true;
    } catch (e) {
      console.warn('[recovery] Не удалось выполнить am start:', (e as Error).message);
    }
  }
  if (!started) {
    try {
      // @ts-ignore
      await driver.activateApp(appPackage);
      started = true;
    } catch (e) {
      console.warn('[recovery] activate после clear-data не удалось:', (e as Error).message);
    }
  }
  // 4. Логируем текущую activity для верификации
  try {
    // @ts-ignore
    const cur = await driver.getCurrentActivity?.();
    if (cur) console.warn('[recovery] Текущая activity после clear-data:', cur);
  } catch {}
  await postStartWait('clear-data');
}

async function strategyReinstall(appPackage: string, apkPath?: string, forced = false) {
  console.warn('[recovery] Выполняю reinstall' + (forced ? ' (forced)' : ''));
  if (!apkPath || !apkPath.endsWith('.apk')) {
    console.warn('[recovery] apkPath не указан или не .apk — откат к restart');
    return strategyRestart(appPackage, apkPath);
  }
  try {
    // @ts-ignore
    await driver.removeApp(appPackage);
  } catch (e) {
    console.warn('[recovery] removeApp ошибка (игнор):', (e as Error).message);
  }
  try {
    // @ts-ignore
    await driver.installApp(apkPath);
  } catch (e) {
    console.warn('[recovery] installApp ошибка:', (e as Error).message);
  }
  const adb = buildAdbCommand();
  const mainActivity = process.env.RECOVER_MAIN_ACTIVITY || process.env.APP_ACTIVITY;
  if (mainActivity) {
    try {
      await execShell(`${adb} shell am start -n ${appPackage}/${mainActivity}`);
    } catch (e) {
      console.warn('[recovery] am start после reinstall не удалось:', (e as Error).message);
    }
  } else {
    try {
      // @ts-ignore
      await driver.activateApp(appPackage);
    } catch (e) {
      console.warn('[recovery] activate после reinstall не удалось:', (e as Error).message);
    }
  }
  try {
    // @ts-ignore
    const cur = await driver.getCurrentActivity?.();
    if (cur) console.warn('[recovery] Текущая activity после reinstall:', cur);
  } catch {}
  await postStartWait('reinstall');
}

async function postStartWait(label: string) {
  try {
    const extraWait = Number(process.env.RECOVER_WAIT_MS || 0);
    if (extraWait > 0) {
      console.warn(`[recovery] (${label}) доп. ожидание: ${extraWait}мс`);
      await pause(extraWait);
    }
  } catch (e) {
    console.warn('[recovery] Ошибка postStartWait:', (e as Error).message);
  }
}

function buildAdbCommand() {
  // Добавляем поддержку выбора конкретного устройства через -s <serial>
  let serial = process.env.UDID || '';
  if (!serial) {
    try {
      const { execSync } = require('child_process');
      const lines: string[] = execSync('adb devices', { stdio: ['pipe', 'pipe', 'ignore'] })
        .toString()
        .trim()
        .split(/\r?\n/)
        .slice(1) // пропускаем заголовок
        .map((l: string) => l.trim())
        .filter((l: string) => /\bdevice$/.test(l));
      if (lines.length) serial = lines[0].split(/\s+/)[0];
    } catch {
      // игнорируем ошибки autodetect
    }
  }
  return serial ? `adb -s ${serial}` : 'adb';
}

async function execShell(cmd: string) {
  // Ленивый импорт чтобы не тянуть модуль раньше времени
  const { exec } = await import('child_process');
  return new Promise<void>((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        return reject(err);
      }
      if (stdout) console.warn('[recovery][pm clear stdout]', stdout.trim());
      if (stderr) console.warn('[recovery][pm clear stderr]', stderr.trim());
      resolve();
    });
  });
}
