import path from 'path';
// Ранний импорт фильтра консоли (QUIET_UI_XML=1 подавит гигантский XML UI)
import './src/utils/consoleFilter';
import allure from '@wdio/allure-reporter';
import * as os from 'os';
import fs from 'fs';
import {
  ensureCleanStateIfPreviousFailed,
  markTestResult,
  wasPreviousTestFailed,
} from './src/utils/testRecovery';
import { TraceEnhancer } from './src/utils/traceEnhancer';

// Проверка доступности Appium
import net from 'net';
async function checkAppiumAvailable(host: string, port: number, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(port, host);
    socket.setTimeout(timeout);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => {
      reject(new Error(`Appium не доступен по адресу ${host}:${port}`));
    });
    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error(`Appium не отвечает по адресу ${host}:${port}`));
    });
  });
}

// Получение статуса / версии Appium сервера
async function fetchAppiumStatus(host: string, port: number): Promise<any | null> {
  return new Promise((resolve) => {
    try {
      const http = require('http');
      const req = http.request(
        { host, port, path: '/status', method: 'GET', timeout: 3000 },
        (res: any) => {
          let data = '';
          res.on('data', (chunk: string) => (data += chunk));
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              resolve(parsed);
            } catch {
              resolve(null);
            }
          });
        },
      );
      req.on('error', () => resolve(null));
      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });
      req.end();
    } catch {
      resolve(null);
    }
  });
}

let cachedApkInfo: { apkPath: string; buildNumber: string } | null = null;
function getLatestApkInfo() {
  if (process.env.APPIUM_APP) {
    const direct = process.env.APPIUM_APP;
    cachedApkInfo = { apkPath: direct, buildNumber: path.basename(direct).replace(/\.apk$/i, '') };
    console.log('[apk] Using APPIUM_APP override:', direct);
    return cachedApkInfo;
  }
  if (cachedApkInfo) return cachedApkInfo;
  const primaryDir = path.join(__dirname, 'apps');
  const altDir = path.join(__dirname, 'src', 'apps');
  let searchDirs = [primaryDir];
  if (!fs.existsSync(primaryDir) && fs.existsSync(altDir)) {
    searchDirs = [altDir];
  } else if (fs.existsSync(primaryDir) && fs.existsSync(altDir)) {
    searchDirs = [primaryDir, altDir]; // приоритет отдается primaryDir
  }
  const apkCandidates: { full: string; time: number; num: number }[] = [];
  for (const dir of searchDirs) {
    try {
      const files = fs.readdirSync(dir);
      for (const f of files) {
        if (/(build-|app-|release|debug).*\.apk$/i.test(f)) {
          const stat = fs.statSync(path.join(dir, f));
          apkCandidates.push({
            full: path.join(dir, f),
            time: stat.mtimeMs,
            num: Number(f.match(/(\d{4,}|\d+)/)?.[0] || 0),
          });
        }
      }
    } catch {}
  }
  if (!apkCandidates.length) {
    // финальный fallback — ожидаем "apps/my-app.apk" (может отсутствовать → будет ошибка позже, но явно логируем)
    const fallback = path.join(primaryDir, 'my-app.apk');
    console.warn('[apk] Не найден ни один *.apk. Fallback:', fallback);
    cachedApkInfo = { apkPath: fallback, buildNumber: 'N/A' };
    return cachedApkInfo;
  }
  apkCandidates.sort((a, b) => b.time - a.time || b.num - a.num);
  const chosen = apkCandidates[0];
  cachedApkInfo = {
    apkPath: chosen.full,
    buildNumber: path.basename(chosen.full).replace(/\.apk$/i, ''),
  };
  console.log('[apk] Selected:', cachedApkInfo.apkPath, 'build:', cachedApkInfo.buildNumber);
  return cachedApkInfo;
}
const { apkPath, buildNumber } = getLatestApkInfo();
// Универсальная функция для формирования capabilities
function resolvePlatformVersion() {
  if (process.env.PLATFORM_VERSION) return process.env.PLATFORM_VERSION;
  try {
    const { execSync } = require('child_process');
    const value = execSync('adb shell getprop ro.build.version.release', {
      stdio: ['pipe', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    return value || 'auto';
  } catch {
    return 'auto';
  }
}

// Автодетект режима (реальный телефон / эмулятор)
function autoDetectRealDevice() {
  const explicit = process.env.REAL_DEVICE; // пользователь может явно задать true/false
  const isCi = !!process.env.CI || !!process.env.JENKINS_URL;
  if (explicit) {
    const val = explicit === 'true';
    console.log(`[device-detect] REAL_DEVICE задан явно: ${explicit}`);
    return { isReal: val, reason: 'explicit_env' };
  }
  // На CI по умолчанию всегда эмулятор чтобы избежать нестабильности USB
  if (isCi) {
    return { isReal: false, reason: 'ci_default' };
  }
  try {
    const { execSync } = require('child_process');
    const out = execSync('adb devices', { stdio: ['pipe', 'pipe', 'ignore'] })
      .toString()
      .trim();
    const lines = out
      .split(/\r?\n/)
      .slice(1)
      .map((l: string) => l.trim())
      .filter((l: string) => l.length);
    const deviceLines = lines.filter((l: string) => /\bdevice$/.test(l));
    // Классифицируем: эмуляторы обычно начинаются с emulator- или 127.0.0.1:
    const physical = deviceLines.filter((l: string) => !/^emulator-/.test(l));
    const emulators = deviceLines.filter((l: string) => /^emulator-/.test(l));
    if (physical.length && !emulators.length) {
      console.log('[device-detect] Найдено физ. устройство, эмуляторов нет → используем phone');
      return { isReal: true, reason: 'only_physical_present' };
    }
    if (physical.length && emulators.length) {
      console.log('[device-detect] Найдены и физ., и эмуляторы. Используем приоритет физ.? -> да');
      return { isReal: true, reason: 'both_present_pref_physical' };
    }
    console.log('[device-detect] Физических устройств нет → эмулятор');
    return { isReal: false, reason: 'no_physical' };
  } catch (e) {
    console.warn('[device-detect] Ошибка при выполнении adb devices, fallback: эмулятор', e);
    return { isReal: false, reason: 'adb_error' };
  }
}

const deviceDetection = autoDetectRealDevice();

function getCapabilities() {
  const isCi = !!process.env.CI || !!process.env.JENKINS_URL;
  const isReal = deviceDetection.isReal;
  let udid = '';
  if (isReal) {
    try {
      udid = getDeviceUdid();
    } catch (e) {
      console.warn('[capabilities] Не удалось определить UDID реального устройства:', e);
      udid = process.env.UDID || '';
    }
  } else {
    udid = process.env.UDID || 'emulator-5554';
  }
  const fullResetFlag = process.env.FULL_RESET === 'true';
  const platformVersion = resolvePlatformVersion();
  const caps: Record<string, any> = {
    platformName: 'Android',
    'appium:platformVersion': platformVersion,
    'appium:automationName': 'UiAutomator2',
    'appium:autoGrantPermissions': true,
    'appium:ignoreHiddenApiPolicyError': true,
    'appium:disableWindowAnimation': true,
    'appium:deviceName': process.env.DEVICE_NAME || (isReal ? 'real_device' : 'emulator-5554'),
    'appium:udid': udid,
    'appium:newCommandTimeout': 120,
    'appium:adbExecTimeout': 60000,
    // На реальном устройстве некоторые прошивки (особенно OEM) блокируют установку/включение io.appium.settings IME → SecurityException.
    // Поэтому включаем unicodeKeyboard только для эмулятора (или если явно FORCED_UNICODE_IME=true).
    'appium:unicodeKeyboard': process.env.FORCED_UNICODE_IME === 'true' ? true : !isReal,
    'appium:resetKeyboard': !isReal,
  };
  if (isCi) {
    // На CI принудительно эмулятор (isReal здесь будет false если explicit не выставлен)
    caps['appium:app'] = process.env.APK_PATH || apkPath;
    caps['appium:noReset'] = !fullResetFlag;
    caps['appium:fullReset'] = fullResetFlag;
    if (process.env.ANDROID_AVD) caps['appium:avd'] = process.env.ANDROID_AVD;
  } else if (isReal) {
    caps['appium:appPackage'] = process.env.APP_PACKAGE || 'com.fin.whiteswan';
    caps['appium:appActivity'] = process.env.APP_ACTIVITY || 'com.fin.whiteswan.MainActivity';
    caps['appium:noReset'] = !fullResetFlag;
    caps['appium:fullReset'] = fullResetFlag;
    if (fs.existsSync(apkPath)) caps['appium:app'] = process.env.APK_PATH || apkPath;
  } else {
    caps['appium:app'] = process.env.APK_PATH || apkPath;
    caps['appium:noReset'] = !fullResetFlag;
    caps['appium:fullReset'] = fullResetFlag;
    caps['appium:appWaitActivity'] =
      process.env.APP_WAIT_ACTIVITY || 'com.fin.whiteswan.MainActivity';
    // Добавляем пакет и активити также для эмулятора, чтобы preSessionUninstall работал
    caps['appium:appPackage'] = process.env.APP_PACKAGE || 'com.fin.whiteswan';
    caps['appium:appActivity'] = process.env.APP_ACTIVITY || 'com.fin.whiteswan.MainActivity';
  }
  console.log(
    '[capabilities][device-select]',
    JSON.stringify({
      isReal,
      detectReason: deviceDetection.reason,
      resolvedUdid: udid,
    }),
  );
  return caps;
}
// @ts-ignore
if (typeof __dirname === 'undefined') {
  throw new Error(
    'This project must run in CommonJS mode. Remove "type": "module" or use ts-node/register.',
  );
}

// Определяем окружение
const isCI = !!process.env.CI || !!process.env.JENKINS_URL;
const isRealDevice = deviceDetection.isReal; // обновлено с учётом автодетекта
// Управление подробностью Allure: VERBOSE_CMDS=true показывает низкоуровневые findElement/isDisplayed и т.п.
const verboseCmds = process.env.VERBOSE_CMDS === 'true';
// (Откат) Убраны подавление протокольных логов и специальные флаги — возвращён стандартный вывод.

function getReportedEnvVars() {
  return {
    OS: os.platform(),
    'OS Version': os.release(),
    Device: process.env.DEVICE_NAME || (isRealDevice ? 'Real Device' : 'Emulator'),
    'App Version': process.env.APP_VERSION || '1.0.0',
    'Node.js': process.version,
    Platform: 'Android',
    'Browser/App': 'Mobile App',
    Environment: isCI ? 'CI (Jenkins)' : isRealDevice ? 'Local (Real Device)' : 'Local (Emulator)',
    UDID: process.env.UDID || 'N/A',
    'Build Number': buildNumber,
    'Full Reset': process.env.FULL_RESET === 'true',
    'Platform Version': process.env.PLATFORM_VERSION || 'auto',
  } as Record<string, any>;
}

// Получение UDID реального устройства
function getDeviceUdid() {
  // Всегда пытаемся определить устройство, независимо от типа (эмулятор или реальное)
  try {
    const { execSync } = require('child_process');
    const output = execSync('adb devices').toString().trim();
    const lines = output.split('\n').slice(1);
    for (const line of lines) {
      const [udid, status] = line.trim().split(/\s+/);
      if (status === 'device' && !/^emulator-/.test(udid)) {
        return udid; // Сначала возвращаем physical устройство
      }
    }
    // Если physical не нашли, возвращаем первый device (эмулятор)
    for (const line of lines) {
      const [udid, status] = line.trim().split(/\s+/);
      if (status === 'device') return udid;
    }
    throw new Error('Не найдено ни одного подключённого Android-устройства');
  } catch (e) {
    throw new Error(`Ошибка при поиске устройства: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// Предварительное удаление приложения (если уже установлено) до старта новой сессии
async function preSessionUninstallIfPresent(capabilities: any) {
  if (process.env.SKIP_PRE_UNINSTALL === 'true' || process.env.KEEP_APP === 'true') {
    console.log('[preSessionUninstall] SKIP_PRE_UNINSTALL/KEEP_APP=true — пропускаем');
    return;
  }
  let appPackage =
    process.env.APP_PACKAGE || capabilities['appium:appPackage'] || capabilities.appPackage;
  if (!appPackage) {
    // Попытка извлечь имя пакета из APK если указан путь и доступен aapt
    const apkCandidate = capabilities['appium:app'] || capabilities.app;
    if (apkCandidate && fs.existsSync(apkCandidate)) {
      try {
        const { execSync } = require('child_process');
        const dump = execSync(`aapt dump badging "${apkCandidate}"`, {
          stdio: ['pipe', 'pipe', 'ignore'],
        })
          .toString()
          .trim();
        const match = dump.match(/package: name='([^']+)'/);
        if (match) {
          appPackage = match[1];
          console.log('[preSessionUninstall] Определён пакет из APK через aapt:', appPackage);
        }
      } catch (e) {
        console.log(
          '[preSessionUninstall] Не удалось извлечь пакет из APK (aapt недоступен или ошибка):',
          (e as Error).message,
        );
      }
    }
  }
  if (!appPackage) {
    console.log(
      '[preSessionUninstall] appPackage не определён (пропуск). Укажи APP_PACKAGE или capabilities.appium:appPackage для включения очистки.',
    );
    return;
  }
  const udid = capabilities['appium:udid'] || capabilities.udid || '';
  const adb = `adb${udid ? ' -s ' + udid : ''}`;
  const { execSync } = require('child_process');
  try {
    const listOut = execSync(`${adb} shell pm list packages ${appPackage}`, {
      stdio: ['pipe', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    const installed = listOut.includes(appPackage);
    console.log(
      `[preSessionUninstall] Пакет ${appPackage} ${
        installed ? 'установлен' : 'не установлен'
      } перед сессией`,
    );
    if (!installed) return; // нечего удалять
  } catch (e) {
    console.warn(
      '[preSessionUninstall] Не удалось проверить наличие пакета (пропуск):',
      (e as Error).message,
    );
    return;
  }
  try {
    // Мягкая остановка и очистка (best-effort)
    try {
      execSync(`${adb} shell am force-stop ${appPackage}`, { stdio: ['pipe', 'pipe', 'ignore'] });
    } catch {}
    try {
      execSync(`${adb} shell pm clear ${appPackage}`, { stdio: ['pipe', 'pipe', 'ignore'] });
    } catch {}
    // Попытка удаления
    let removed = false;
    for (let i = 1; i <= 2 && !removed; i++) {
      try {
        const out = execSync(`${adb} uninstall ${appPackage}`, { stdio: ['pipe', 'pipe', 'pipe'] })
          .toString()
          .trim();
        console.log(`[preSessionUninstall] adb uninstall попытка #${i}: ${out || '(пусто)'}`);
        removed = /success/i.test(out);
      } catch (uErr) {
        console.warn(`[preSessionUninstall] adb uninstall ошибка #${i}:`, (uErr as Error).message);
      }
    }
    if (!removed) {
      try {
        const out2 = execSync(`${adb} shell pm uninstall ${appPackage}`, {
          stdio: ['pipe', 'pipe', 'pipe'],
        })
          .toString()
          .trim();
        console.log('[preSessionUninstall] pm uninstall output:', out2 || '(пусто)');
        removed = /Success/i.test(out2);
      } catch (e) {
        console.warn('[preSessionUninstall] pm uninstall ошибка:', (e as Error).message);
      }
    }
    // Финальная проверка
    try {
      const list2 = execSync(`${adb} shell pm list packages ${appPackage}`, {
        stdio: ['pipe', 'pipe', 'ignore'],
      })
        .toString()
        .trim();
      const still = list2.includes(appPackage);
      console.log(
        `[preSessionUninstall] Итог: пакет ${
          still ? 'ВСЕ ЕЩЁ УСТАНОВЛЕН (переустановка поверх)' : 'удалён, будет чистая установка'
        } `,
      );
    } catch {}
  } catch (e) {
    console.warn(
      '[preSessionUninstall] Общая ошибка процедуры удаления (игнор):',
      (e as Error).message,
    );
  }
}

export const config = {
  // Автокомпиляция TS (WDIO v8+) — чтобы не зависеть от глобального ts-node
  autoCompileOpts: {
    tsNodeOpts: {
      transpileOnly: true,
      project: path.join(__dirname, 'tsconfig.json'),
    },
  },
  // Хук перед запуском каждого теста для начала записи экрана + очистка logcat
  beforeTest: async function () {
    try {
      const appPackage = process.env.APP_PACKAGE || 'com.fin.whiteswan';
      const effectiveApk = process.env.APK_PATH || apkPath;
      console.log('[recovery][beforeTest] previousTestFailed=', wasPreviousTestFailed());
      await ensureCleanStateIfPreviousFailed(appPackage, effectiveApk);
    } catch (e) {
      console.warn('[beforeTest] Ошибка в ensureCleanStateIfPreviousFailed:', (e as Error).message);
    }
    const disableVideo = process.env.DISABLE_NATIVE_VIDEO === 'true';
    const clearLogcat = process.env.CLEAR_LOGCAT !== 'false'; // по умолчанию true
    if (clearLogcat) {
      try {
        const { execSync } = require('child_process');
        // Проверим доступность adb и хотя бы одного устройства
        let devicesOutput = '';
        try {
          devicesOutput = execSync('adb devices', { stdio: ['pipe', 'pipe', 'pipe'] })
            .toString()
            .trim();
        } catch {
          console.warn('[beforeTest] adb не найден в PATH — пропускаю очистку logcat');
          devicesOutput = '';
        }
        if (devicesOutput && /\bdevice$/m.test(devicesOutput)) {
          try {
            // Используем функцию getDeviceUdid() для правильного определения устройства
            const targetDevice = getDeviceUdid();
            const adbCommand = targetDevice ? `adb -s ${targetDevice} logcat -c` : 'adb logcat -c';

            execSync(adbCommand, { stdio: ['pipe', 'pipe', 'pipe'] });
          } catch (clrErr) {
            console.warn(
              '[beforeTest] Не удалось очистить logcat (игнорирую):',
              (clrErr as Error).message,
            );
          }
        } else {
          console.warn('[beforeTest] Нет подключённых устройств для очистки logcat — пропуск');
        }
      } catch (e) {
        console.warn(
          '[beforeTest] Ошибка при попытке подготовки logcat (игнорирую):',
          (e as Error).message,
        );
      }
    }
    if (!disableVideo) {
      try {
        // @ts-ignore
        await driver.startRecordingScreen();
      } catch (e) {
        console.warn('[beforeTest] Не удалось начать запись экрана:', e);
      }
    }
  },
  // WDIO v9 корректная сигнатура: afterTest(test, context, { error, result, duration, passed, retries })
  afterTest: async function (
    test: { title: string; fullName?: string },
    _context: unknown,
    resultObj: {
      error?: Error;
      passed?: boolean; // делаем опциональным на случай несовпадения версий
      duration?: number;
      retries?: { attempts: number; limit: number };
    },
  ) {
    // WDIO v9: третий параметр содержит результат. Ранее из-за неправильной сигнатуры passed был undefined.
    const error = resultObj?.error;
    // Если фреймворк не передал passed (из-за несовместимости), вычисляем: passed = !error
    const passed = typeof resultObj?.passed === 'boolean' ? resultObj.passed : !error;
    try {
      markTestResult(passed);
    } catch (e) {
      console.warn('[afterTest] markTestResult error:', (e as Error).message);
    }
    try {
      // @ts-ignore
      allure.addAttachment(
        'Raw afterTest payload',
        JSON.stringify(
          {
            title: test.title,
            fullName: test.fullName,
            passed,
            hasError: !!error,
            errorMessage: error?.message,
          },
          null,
          2,
        ),
        'application/json',
      );
    } catch {}
    console.log(
      '[afterTest] test="' +
        test.title +
        '" passed=' +
        passed +
        ' error=' +
        (error?.message || 'none'),
    );
    // Fallback attachVideo ищет последний видеофайл
    async function waitForStableFile(
      filePath: string,
      attempts = 5,
      intervalMs = 400,
    ): Promise<boolean> {
      try {
        let lastSize = -1;
        for (let i = 0; i < attempts; i++) {
          if (!fs.existsSync(filePath)) {
            await new Promise((r) => setTimeout(r, intervalMs));
            continue;
          }
          const stat = fs.statSync(filePath);
          if (stat.size === lastSize && stat.size > 0) return true;
          lastSize = stat.size;
          await new Promise((r) => setTimeout(r, intervalMs));
        }
        return false;
      } catch {
        return false;
      }
    }
    async function attachVideo(): Promise<void> {
      try {
        const videoDir = path.join(__dirname, 'allure-results', 'videos');
        if (!fs.existsSync(videoDir)) return;
        // Берём самый свежий видеофайл (mp4/webm)
        const files = fs
          .readdirSync(videoDir)
          .filter((f) => /\.(mp4|webm)$/.test(f))
          .map((f) => ({ name: f, time: fs.statSync(path.join(videoDir, f)).mtimeMs }))
          .sort((a, b) => b.time - a.time);
        if (!files.length) return;
        const latest = files[0].name;
        const videoPath = path.join(videoDir, latest);
        await waitForStableFile(videoPath); // дождаться, пока файл "дозапишется"
        const videoBuffer = fs.readFileSync(videoPath);
        const mimeType = latest.endsWith('.webm') ? 'video/webm' : 'video/mp4';
        // @ts-ignore
        allure.addAttachment('Видео (последнее)', videoBuffer, mimeType);
      } catch (e) {
        console.warn('[afterTest] Не удалось прикрепить видео:', e);
      }
    }
    let videoBase64: string | null = null;
    const disableVideo = process.env.DISABLE_NATIVE_VIDEO === 'true';
    const alwaysVideo = process.env.ALWAYS_ATTACH_VIDEO === 'true';
    if (!disableVideo) {
      try {
        // @ts-ignore
        videoBase64 = await driver.stopRecordingScreen();
      } catch (e) {
        console.warn('[afterTest] Не удалось остановить запись экрана:', e);
      }
    }

    const failed = !!error;
    const attachOnPassScreenshot = process.env.SCREENSHOT_ON_PASS === 'true';
    const attachLogsOnPass = process.env.LOGS_ON_PASS === 'true';

    if (failed || attachOnPassScreenshot) {
      try {
        const screenshot = await browser.takeScreenshot();
        // @ts-ignore
        allure.addAttachment('Скриншот при ошибке', Buffer.from(screenshot, 'base64'), 'image/png');
      } catch (e) {
        console.warn('[afterTest] Не удалось сделать или прикрепить скриншот:', e);
      }
    }
    if (failed) {
      try {
        // @ts-ignore
        allure.addAttachment(
          'Failure meta',
          `Тест упал: ${test.title}\nОшибка: ${error?.message}`,
          'text/plain',
        );
      } catch (e) {
        console.warn('[afterTest] Не удалось прикрепить мета информацию об ошибке:', e);
      }

      // Собираем полную отладочную информацию для упавшего теста
      const enableEnhancedDebug = process.env.ENHANCED_DEBUG !== 'false'; // по умолчанию включено
      if (enableEnhancedDebug) {
        try {
          console.log('[afterTest] Собираем расширенную отладочную информацию...');
          const debugInfo = await TraceEnhancer.collectFullDebugInfo(
            browser,
            test.title || 'Unknown Test',
            error || new Error('Unknown error'),
          );

          // Прикрепляем отформатированный отчет
          const debugReport = TraceEnhancer.formatDebugReport(debugInfo);
          // @ts-ignore
          allure.addAttachment('🔍 Полная отладочная информация', debugReport, 'text/plain');

          // Прикрепляем UI hierarchy отдельно для удобства анализа
          if (debugInfo.uiHierarchy) {
            // @ts-ignore
            allure.addAttachment('📱 UI Hierarchy (XML)', debugInfo.uiHierarchy, 'text/xml');
          }

          // Прикрепляем отфильтрованные логи приложения
          if (debugInfo.filteredLogs) {
            // @ts-ignore
            allure.addAttachment(
              '📋 Логи приложения (фильтрованные)',
              debugInfo.filteredLogs,
              'text/plain',
            );
          }

          console.log('[afterTest] Расширенная отладочная информация собрана и прикреплена');
        } catch (e) {
          console.warn('[afterTest] Не удалось собрать расширенную отладочную информацию:', e);
        }
      } else {
        console.log(
          '[afterTest] Расширенная отладочная информация отключена (ENHANCED_DEBUG=false)',
        );
      }

      // Если удалось получить прямую запись экрана — прикрепляем её приоритетно
      if (videoBase64) {
        try {
          const videoBuffer = Buffer.from(videoBase64, 'base64');
          // @ts-ignore
          allure.addAttachment('Видео (screen recording)', videoBuffer, 'video/mp4');
        } catch (e) {
          console.warn('[afterTest] Не удалось прикрепить video (screen recording):', e);
        }
      } else {
        await attachVideo();
      }
      // logcat tail
      try {
        const { execSync } = require('child_process');
        // Сначала проверим, доступен ли adb
        try {
          execSync('adb devices', { stdio: ['pipe', 'pipe', 'pipe'] });
        } catch {
          console.warn('[afterTest] adb недоступен — пропускаю сбор logcat');
          throw new Error('adb недоступен');
        }

        const appPackage = process.env.APP_PACKAGE || 'com.fin.whiteswan';
        // Используем функцию getDeviceUdid() для правильного определения устройства
        const targetDevice = getDeviceUdid();
        let adbCommand = targetDevice
          ? `adb -s ${targetDevice} logcat -d -t 500`
          : 'adb logcat -d -t 500';

        // Попробуем получить PID приложения для фильтрации logcat
        try {
          const pidCommand = targetDevice
            ? `adb -s ${targetDevice} shell pidof ${appPackage}`
            : `adb shell pidof ${appPackage}`;
          const pidOut = execSync(pidCommand, { stdio: ['pipe', 'pipe', 'pipe'] })
            .toString()
            .trim();
          if (pidOut) {
            const pid = pidOut.split(/\s+/)[0];
            adbCommand = targetDevice
              ? `adb -s ${targetDevice} logcat -d --pid=${pid} -t 500`
              : `adb logcat -d --pid=${pid} -t 500`;
            console.log(`[afterTest] Фильтрую logcat по PID ${pid} для пакета ${appPackage}`);
          } else {
            console.warn(
              `[afterTest] PID для пакета ${appPackage} не найден, использую общий logcat`,
            );
          }
        } catch (e) {
          console.warn(
            '[afterTest] Не удалось получить PID приложения для фильтрации logcat:',
            (e as Error).message,
          );
          // fallback to general logcat
        }

        const logcat = execSync(adbCommand, {
          stdio: ['pipe', 'pipe', 'pipe'],
        }).toString();
        // @ts-ignore
        allure.addAttachment('logcat (tail 500)', logcat, 'text/plain');
      } catch (e) {
        console.warn('[afterTest] Не удалось получить logcat:', e);
      }
      // meminfo
      try {
        const appPackage = process.env.APP_PACKAGE || 'com.fin.whiteswan';
        const { execSync } = require('child_process');
        // Используем функцию getDeviceUdid() для правильного определения устройства
        const targetDevice = getDeviceUdid();
        const adbCommand = targetDevice
          ? `adb -s ${targetDevice} shell dumpsys meminfo ${appPackage}`
          : `adb shell dumpsys meminfo ${appPackage}`;

        const raw = execSync(adbCommand, {
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 8000,
        }).toString();
        let linesLimit = Number(process.env.MEMINFO_LINES || 120);
        if (Number.isNaN(linesLimit) || linesLimit <= 0) linesLimit = 120;
        const lines = raw.split(/\r?\n/).filter((l: string) => l.trim().length > 0);
        // Попробуем вытащить ключевые секции
        const wantedHeaders = [
          'App Summary',
          'Dalvik Heap',
          'Native Heap',
          'TOTAL',
          'Objects',
          'Heap Alloc',
        ];
        const selected: string[] = [];
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (wantedHeaders.some((h) => line.includes(h))) {
            // захватим до 6 строк после заголовка
            selected.push(line);
            for (let j = 1; j <= 6 && i + j < lines.length; j++) {
              if (/^[A-Za-z].+:$/.test(lines[i + j])) break; // новый заголовок
              selected.push(lines[i + j]);
            }
          }
          if (selected.length > linesLimit) break;
        }
        let finalText: string;
        if (selected.length >= 5) {
          finalText = selected.slice(0, linesLimit).join('\n');
        } else {
          finalText = lines.slice(0, linesLimit).join('\n');
        }
        if (!finalText.trim()) {
          finalText =
            '[meminfo] Пустой вывод — возможно ограниченные разрешения или пакет не найден';
        }
        // @ts-ignore
        allure.addAttachment('dumpsys meminfo (partial)', finalText, 'text/plain');
      } catch (e) {
        console.warn('[afterTest] Не удалось получить meminfo:', e);
      }
    } else if (alwaysVideo && videoBase64 && !disableVideo) {
      // Видео для успешных тестов, если явно запрошено
      try {
        const videoBuffer = Buffer.from(videoBase64, 'base64');
        // @ts-ignore
        allure.addAttachment('Видео (screen recording / passed)', videoBuffer, 'video/mp4');
      } catch (e) {
        console.warn('[afterTest] Не удалось прикрепить видео (passed):', e);
      }
    }

    if (!failed && attachLogsOnPass) {
      try {
        const { execSync } = require('child_process');
        const appPackage = process.env.APP_PACKAGE || 'com.fin.whiteswan';
        // Используем функцию getDeviceUdid() для правильного определения устройства
        const targetDevice = getDeviceUdid();
        let adbCommand = targetDevice
          ? `adb -s ${targetDevice} logcat -d -t 200`
          : 'adb logcat -d -t 200';

        // Попробуем получить PID приложения для фильтрации logcat
        try {
          const pidCommand = targetDevice
            ? `adb -s ${targetDevice} shell pidof ${appPackage}`
            : `adb shell pidof ${appPackage}`;
          const pidOut = execSync(pidCommand, { stdio: ['pipe', 'pipe', 'pipe'] })
            .toString()
            .trim();
          if (pidOut) {
            const pid = pidOut.split(/\s+/)[0];
            adbCommand = targetDevice
              ? `adb -s ${targetDevice} logcat -d --pid=${pid} -t 200`
              : `adb logcat -d --pid=${pid} -t 200`;
          }
        } catch (e) {
          // fallback to general logcat
        }

        const logcat = execSync(adbCommand, {
          stdio: ['pipe', 'pipe', 'ignore'],
        }).toString();
        // @ts-ignore
        allure.addAttachment('logcat (pass tail 200)', logcat, 'text/plain');
      } catch {}
    }
  },
  runner: 'local' as const,
  specs: ['./tests/**/*.ts'],
  exclude: [],

  maxInstances: 1,
  capabilities: [getCapabilities()],

  // Возвращаем дефолтный уровень логирования (можно переопределить LOG_LEVEL при запуске)
  logLevel: (process.env.LOG_LEVEL || 'info') as any,
  // logLevels: undefined — не задаём частичные уровни, чтобы видеть все команды
  // Не перенаправляем вывод в каталог (выключено)
  // Порт Appium централизованно параметризуется через APPIUM_PORT (для будущего параллелизма)
  services: [
    [
      'appium',
      {
        command: 'appium',
        args: {
          port: Number(process.env.APPIUM_PORT || 4724),
          basePath: '/',
          allowInsecure: 'chromedriver_autodownload',
        },
      },
    ],
  ],
  reporters: ((): any => {
    const base: any[] = [
      'spec',
      [
        'allure',
        {
          outputDir: path.join(__dirname, 'allure-results'),
          disableWebdriverStepsReporting: !verboseCmds,
          disableWebdriverScreenshotsReporting: !verboseCmds,
          useCucumberStepReporter: false,
          addConsoleLogs: verboseCmds,
          reportedEnvironmentVars: getReportedEnvVars(),
        },
      ],
    ];
    // Видео репортер отключён (создавал бесполезные короткие файлы в before hooks).
    // Можно вернуть, установив ENABLE_WDIO_VIDEO_REPORTER=true
    if (process.env.ENABLE_WDIO_VIDEO_REPORTER === 'true') {
      base.push([
        'video',
        {
          saveAllVideos: false,
          videoSlowdownMultiplier: 3,
          outputDir: path.join(__dirname, 'allure-results', 'videos'),
        },
      ]);
    }
    return base;
  })(),

  mochaOpts: {
    ui: 'bdd' as const,
    timeout: 300000,
    retries: process.env.CI ? 1 : 0,
  },

  hostname: process.env.APPIUM_HOST || (isCI ? '0.0.0.0' : 'localhost'),
  port: Number(process.env.APPIUM_PORT || 4724),
  path: '/',

  onPrepare: function () {
    const resultsDir = path.join(__dirname, 'allure-results');
    const attachmentsDir = path.join(resultsDir, 'attachments');
    try {
      if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
      }
      if (!fs.existsSync(attachmentsDir)) {
        fs.mkdirSync(attachmentsDir, { recursive: true });
      }

      // --- Allure environment.properties ---
      const baseEnv = getReportedEnvVars();
      const extra = {
        'Test DB Version': process.env.TEST_DB_VERSION || 'N/A',
        User: process.env.TEST_USER || 'N/A',
      } as Record<string, any>;
      const allEnv = { ...baseEnv, ...extra };
      const envLines = Object.entries(allEnv).map(([k, v]) => `${k}=${v}`);
      fs.writeFileSync(path.join(resultsDir, 'environment.properties'), envLines.join('\n'));
    } catch (e) {
      throw e;
    }
    // 🔥 Получение UDID теперь происходит непосредственно в capabilities
  },

  beforeSession: function (_config: any, capabilities: any) {
    try {
      console.log('[capabilities]', JSON.stringify(capabilities, null, 2));
      // @ts-ignore
      allure.addAttachment(
        'Runtime Capabilities',
        JSON.stringify(capabilities, null, 2),
        'application/json',
      );
    } catch (e) {
      console.warn('[beforeSession] Не удалось залогировать capabilities:', e);
    }
    // Синхронно вызвать предварительное удаление (используем execSync внутри) до старта сессии
    return preSessionUninstallIfPresent(capabilities);
  },

  before: async function () {
    // Проверяем доступность Appium после старта сервиса
    const appiumPort = Number(process.env.APPIUM_PORT || 4724);
    const appiumHost = process.env.APPIUM_HOST || 'localhost';
    await new Promise((resolve) => setTimeout(resolve, 2000)); // задержка 2 сек
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await checkAppiumAvailable(appiumHost, appiumPort);
        if (attempt > 1) {
          console.warn(`[before] Appium доступен после повторной попытки #${attempt}`);
        }
        // После подтверждения доступности — получаем статус и версию
        try {
          const status = await fetchAppiumStatus(appiumHost, appiumPort);
          if (status) {
            console.log('[appium.status]', JSON.stringify(status, null, 2));
            // @ts-ignore
            allure.addAttachment(
              'Appium Status',
              JSON.stringify(status, null, 2),
              'application/json',
            );
          }
        } catch (e) {
          console.warn('[before] Не удалось получить статус Appium:', e);
        }
        return;
      } catch (err) {
        console.warn(`[before] Попытка ${attempt} не удалась:`, (err as Error).message);
        if (attempt === maxRetries) {
          throw err;
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  },

  after: async function () {
    // Упрощено: финальная очистка приложения перенесена в afterSession
  },

  afterSession: async function () {
    if (process.env.KEEP_APP === 'true') {
      console.log('[afterSession] KEEP_APP=true — пропускаем удаление приложения');
      return;
    }
    try {
      const appPackage = process.env.APP_PACKAGE || 'com.fin.whiteswan';
      if (browser.sessionId) {
        await browser.terminateApp(appPackage);
        await browser.removeApp(appPackage);
      }
    } catch (e) {
      console.warn('[afterSession] Ошибка при финальном удалении приложения:', e);
    }
  },

  // Выполняется после полного завершения раннера (репорт сформирован, сессии закрыты)
  onComplete: function () {
    const appPackage = process.env.APP_PACKAGE || 'com.fin.whiteswan';
    const resultsDir = path.join(__dirname, 'allure-results');
    const logLines: string[] = [];
    function log(line: string) {
      logLines.push(line);
      console.log(line);
    }
    try {
      const { execSync } = require('child_process');
      // Определяем serial (UDID) если есть
      let serial = process.env.UDID || '';
      if (!serial) {
        try {
          const devicesOut = execSync('adb devices', { stdio: ['pipe', 'pipe', 'ignore'] })
            .toString()
            .trim()
            .split(/\r?\n/)
            .slice(1)
            .map((l: string) => l.trim())
            .filter((l: string) => /\bdevice$/.test(l));
          if (devicesOut.length) serial = devicesOut[0].split(/\s+/)[0];
        } catch {}
      }
      const adb = `adb${serial ? ' -s ' + serial : ''}`;
      log(`[onComplete] Принудительное удаление приложения ${appPackage} (adb='${adb}')`);

      // Предварительный force-stop и pm clear — уменьшают шанс блокировок
      try {
        execSync(`${adb} shell am force-stop ${appPackage}`, { stdio: ['pipe', 'pipe', 'ignore'] });
        log('[onComplete] force-stop выполнен');
      } catch (e) {
        log('[onComplete] force-stop не выполнен: ' + (e as Error).message);
      }
      try {
        execSync(`${adb} shell pm clear ${appPackage}`, { stdio: ['pipe', 'pipe', 'ignore'] });
        log('[onComplete] pm clear выполнен');
      } catch (e) {
        log('[onComplete] pm clear не выполнен: ' + (e as Error).message);
      }

      // Проверим установлен ли пакет
      let installed = false;
      try {
        const list = execSync(`${adb} shell pm list packages ${appPackage}`, {
          stdio: ['pipe', 'pipe', 'ignore'],
        })
          .toString()
          .trim();
        installed = list.includes(appPackage);
        log(`[onComplete] Пакет ${installed ? 'найден' : 'не найден'} перед удалением`);
      } catch (e) {
        log('[onComplete] Не удалось проверить наличие пакета (игнор)');
      }

      if (!installed) {
        log('[onComplete] Пакет не установлен — пропускаем uninstall');
      } else {
        // Попытки обычного adb uninstall
        const attempts = 3;
        let removed = false;
        for (let i = 1; i <= attempts && !removed; i++) {
          try {
            const out = execSync(`${adb} uninstall ${appPackage}`, {
              stdio: ['pipe', 'pipe', 'pipe'],
            })
              .toString()
              .trim();
            log(`[onComplete] adb uninstall попытка #${i} output: ${out || '(пусто)'}`);
            if (/success/i.test(out)) {
              removed = true;
              break;
            }
          } catch (uErr) {
            log(`[onComplete] adb uninstall попытка #${i} ошибка: ${(uErr as Error).message}`);
          }
        }
        // Fallback: pm uninstall (через shell) если не удалилось
        if (!removed) {
          try {
            const out2 = execSync(`${adb} shell pm uninstall ${appPackage}`, {
              stdio: ['pipe', 'pipe', 'pipe'],
            })
              .toString()
              .trim();
            log(`[onComplete] pm uninstall output: ${out2 || '(пусто)'}`);
            if (/Success/i.test(out2)) removed = true;
          } catch (e) {
            log('[onComplete] pm uninstall ошибка: ' + (e as Error).message);
          }
        }
        // Финальная проверка
        try {
          const list2 = execSync(`${adb} shell pm list packages ${appPackage}`, {
            stdio: ['pipe', 'pipe', 'ignore'],
          })
            .toString()
            .trim();
          const stillInstalled = list2.includes(appPackage);
          log(
            `[onComplete] Итог: пакет ${
              stillInstalled ? 'ВСЕ ЕЩЁ УСТАНОВЛЕН (ПРОВЕРИТЬ ВРУЧНУЮ)' : 'удалён'
            }`,
          );
        } catch (e) {
          log('[onComplete] Финальная проверка не удалась: ' + (e as Error).message);
        }
      }
    } catch (e) {
      log('[onComplete] Общая ошибка процедуры удаления: ' + (e as Error).message);
    } finally {
      try {
        if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });
        fs.writeFileSync(
          path.join(resultsDir, 'final-uninstall.log'),
          logLines.join('\n'),
          'utf-8',
        );
      } catch {}
    }
  },
};

export type Config = typeof config;
