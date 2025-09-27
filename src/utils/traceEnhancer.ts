import { execSync } from 'child_process';

export interface DebugInfo {
  timestamp: string;
  testName: string;
  error: string;
  uiHierarchy?: string;
  appContext?: AppContext;
  systemInfo?: SystemInfo;
  filteredLogs?: string;
  performanceMetrics?: PerformanceMetrics;
  elementInfo?: ElementErrorInfo; // Новая информация об элементе из ошибки
}

interface AppContext {
  currentActivity: string;
  currentPackage: string;
  appState?: any;
  networkConnectivity?: string;
}

interface SystemInfo {
  deviceModel: string;
  androidVersion: string;
  memoryUsage: string;
  batteryLevel?: number;
}

interface PerformanceMetrics {
  memoryMB: number;
  cpuUsage?: string;
  networkLatency?: number;
}

// Новая информация об элементе из ошибки
interface ElementErrorInfo {
  selector?: string;
  method?: string;
  elementDetails?: string;
}

/**
 * Собирает максимально полную отладочную информацию для анализа багов
 */
export class TraceEnhancer {
  /**
   * Получает ID активного устройства для adb команд
   */
  private static getActiveDeviceId(): string {
    try {
      const devicesOutput = execSync('adb devices', {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 5000,
      }).toString();

      // Ищем первое подключенное устройство
      const lines = devicesOutput.split('\n');
      for (const line of lines) {
        if (line.includes('\tdevice')) {
          const deviceId = line.split('\t')[0].trim();
          console.log(`[TraceEnhancer] Using device: ${deviceId}`);
          return deviceId;
        }
      }

      console.warn('[TraceEnhancer] No active device found');
      return '';
    } catch (error) {
      console.warn('[TraceEnhancer] Failed to get device list:', error);
      return '';
    }
  }

  /**
   * Выполняет adb команду с указанием конкретного устройства
   */
  private static execAdbCommand(command: string, timeout = 5000): string {
    const deviceId = this.getActiveDeviceId();
    const deviceFlag = deviceId ? `-s ${deviceId}` : '';
    const fullCommand = `adb ${deviceFlag} ${command}`;

    console.log(`[TraceEnhancer] Executing: ${fullCommand}`);

    return execSync(fullCommand, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout,
    }).toString();
  }

  /**
   * Извлекает информацию об элементе из ошибки (если она была добавлена в BasePage)
   */
  private static extractElementInfoFromError(error: Error): ElementErrorInfo | undefined {
    const enhancedError = error as any;

    if (enhancedError.selector || enhancedError.method || enhancedError.elementInfo) {
      return {
        selector: enhancedError.selector,
        method: enhancedError.method,
        elementDetails: enhancedError.elementInfo,
      };
    }

    // Пытаемся извлечь информацию из сообщения об ошибке
    const message = error.message;
    const elementInfo: ElementErrorInfo = {};

    // Ищем паттерны в сообщении
    const selectorMatch = message.match(/element "([^"]+)"/);
    if (selectorMatch) {
      elementInfo.selector = selectorMatch[1];
    }

    const methodMatch = message.match(/method "([^"]+)"/);
    if (methodMatch) {
      elementInfo.method = methodMatch[1];
    }

    // Если нашли хоть что-то, возвращаем
    if (elementInfo.selector || elementInfo.method) {
      return elementInfo;
    }

    return undefined;
  }
  /**
   * Основной метод для сбора всей доступной trace информации
   */
  static async collectFullDebugInfo(
    driver: WebdriverIO.Browser,
    testName: string,
    error: Error,
  ): Promise<DebugInfo> {
    console.log('[TraceEnhancer] Собираем полную отладочную информацию...');

    const debugInfo: DebugInfo = {
      timestamp: new Date().toISOString(),
      testName,
      error: error.message,
    };

    // Извлекаем информацию об элементе из ошибки
    debugInfo.elementInfo = this.extractElementInfoFromError(error);

    // Параллельно собираем разную информацию для скорости
    const promises = [
      this.getUIHierarchy(driver).catch((e) => `Ошибка получения UI: ${e.message}`),
      this.getAppContext(driver).catch((e) => ({ error: e.message })),
      this.getSystemInfo().catch((e) => ({ error: e.message })),
      this.getFilteredLogs().catch((e) => `Ошибка получения логов: ${e.message}`),
      this.getPerformanceMetrics().catch((e) => ({ error: e.message })),
    ];

    try {
      const [uiHierarchy, appContext, systemInfo, filteredLogs, performanceMetrics] =
        await Promise.all(promises);

      debugInfo.uiHierarchy = uiHierarchy as string;
      debugInfo.appContext = appContext as AppContext;
      debugInfo.systemInfo = systemInfo as SystemInfo;
      debugInfo.filteredLogs = filteredLogs as string;
      debugInfo.performanceMetrics = performanceMetrics as PerformanceMetrics;
    } catch (e) {
      console.warn('[TraceEnhancer] Ошибка при сборе информации:', e);
    }

    console.log('[TraceEnhancer] Сбор информации завершен');
    return debugInfo;
  }

  /**
   * Получает полную UI hierarchy для анализа состояния экрана
   */
  private static async getUIHierarchy(driver: WebdriverIO.Browser): Promise<string> {
    try {
      const source = await driver.getPageSource();
      return source;
    } catch (error) {
      return `Не удалось получить UI hierarchy: ${error}`;
    }
  }

  /**
   * Собирает контекст приложения
   */
  private static async getAppContext(driver: WebdriverIO.Browser): Promise<AppContext> {
    const context: AppContext = {
      currentActivity: 'unknown',
      currentPackage: 'unknown',
    };

    try {
      context.currentActivity = await driver.getCurrentActivity();
      context.currentPackage = await driver.getCurrentPackage();

      // Проверяем сетевое подключение
      try {
        const networkState = await driver.getNetworkConnection();
        context.networkConnectivity = this.parseNetworkState(networkState);
      } catch (e) {
        context.networkConnectivity = 'unknown';
      }
    } catch (error) {
      console.warn('[TraceEnhancer] Ошибка получения контекста приложения:', error);
    }

    return context;
  }

  /**
   * Собирает системную информацию устройства
   */
  private static async getSystemInfo(): Promise<SystemInfo> {
    const info: SystemInfo = {
      deviceModel: 'unknown',
      androidVersion: 'unknown',
      memoryUsage: 'unknown',
    };

    try {
      // Получаем информацию об устройстве
      try {
        const deviceInfo = this.execAdbCommand('shell getprop ro.product.model').trim();
        info.deviceModel = deviceInfo || 'unknown';
        console.log(`[TraceEnhancer] Device model: ${info.deviceModel}`);
      } catch (e) {
        console.warn('[TraceEnhancer] Failed to get device model:', e);
        info.deviceModel = 'adb_error';
      }

      try {
        const androidVer = this.execAdbCommand('shell getprop ro.build.version.release').trim();
        info.androidVersion = androidVer || 'unknown';
        console.log(`[TraceEnhancer] Android version: ${info.androidVersion}`);
      } catch (e) {
        console.warn('[TraceEnhancer] Failed to get Android version:', e);
        info.androidVersion = 'adb_error';
      }

      // Получаем использование памяти
      try {
        const memInfo = this.execAdbCommand('shell cat /proc/meminfo | head -3');
        info.memoryUsage = memInfo || 'unknown';
        console.log(`[TraceEnhancer] Memory info length: ${memInfo.length} chars`);
      } catch (e) {
        console.warn('[TraceEnhancer] Failed to get memory info:', e);
        info.memoryUsage = 'adb_error';
      }

      // Пытаемся получить уровень батареи
      try {
        const batteryLevel = this.execAdbCommand('shell dumpsys battery | grep level');
        const match = batteryLevel.match(/level: (\d+)/);
        if (match) {
          info.batteryLevel = parseInt(match[1]);
          console.log(`[TraceEnhancer] Battery level: ${info.batteryLevel}%`);
        } else {
          console.warn('[TraceEnhancer] Battery level not found in output:', batteryLevel);
        }
      } catch (e) {
        console.warn('[TraceEnhancer] Failed to get battery level:', e);
        info.batteryLevel = undefined;
      }
    } catch (error) {
      console.warn('[TraceEnhancer] Ошибка получения системной информации:', error);
    }

    return info;
  }

  /**
   * Получает отфильтрованные логи только для нашего приложения
   */
  private static async getFilteredLogs(): Promise<string> {
    try {
      const appPackage = process.env.APP_PACKAGE || 'com.fin.whiteswan';
      const deviceId = this.getActiveDeviceId();
      const deviceFlag = deviceId ? `-s ${deviceId}` : '';

      // Сначала получаем все логи, потом фильтруем
      console.log('[TraceEnhancer] Getting device logs...');
      const allLogs = execSync(`adb ${deviceFlag} logcat -d -t 1000`, {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 10000,
      }).toString();

      // Фильтруем в JavaScript, так как grep может не работать на Windows
      const lines = allLogs.split('\n');
      const filteredLines = lines.filter((line) => {
        const lowerLine = line.toLowerCase();
        return (
          lowerLine.includes(appPackage.toLowerCase()) ||
          lowerLine.includes('reactnativejs') ||
          lowerLine.includes('fatal') ||
          lowerLine.includes('androidruntime')
        );
      });

      const filteredLogs = filteredLines.join('\n');
      console.log(`[TraceEnhancer] Filtered ${filteredLines.length} relevant log lines`);

      return filteredLogs || 'Релевантные логи не найдены';
    } catch (error) {
      console.warn('[TraceEnhancer] Error getting filtered logs:', error);
      return `Ошибка получения логов: ${error}`;
    }
  }

  /**
   * Собирает метрики производительности
   */
  private static async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const metrics: PerformanceMetrics = {
      memoryMB: 0,
    };

    try {
      const appPackage = process.env.APP_PACKAGE || 'com.fin.whiteswan';

      // Получаем использование памяти приложением
      try {
        const memInfo = this.execAdbCommand(`shell dumpsys meminfo ${appPackage}`, 8000);

        console.log(`[TraceEnhancer] Full meminfo length: ${memInfo.length} chars`);

        // Ищем строку с TOTAL
        let match = memInfo.match(/TOTAL\s+(\d+)/);
        if (match) {
          metrics.memoryMB = Math.round(parseInt(match[1]) / 1024); // KB to MB
          console.log(`[TraceEnhancer] App memory usage: ${metrics.memoryMB}MB`);
        } else {
          console.warn('[TraceEnhancer] TOTAL memory not found, trying alternative...');
          // Ищем первую строку с числами (обычно это общее использование)
          match = memInfo.match(/^\s*(\d+)\s+(\d+)\s+(\d+)/m);
          if (match) {
            metrics.memoryMB = Math.round(parseInt(match[1]) / 1024);
            console.log(`[TraceEnhancer] App memory usage (alternative): ${metrics.memoryMB}MB`);
          } else {
            console.warn('[TraceEnhancer] Could not parse memory info');
            metrics.memoryMB = -1;
          }
        }
      } catch (memError) {
        console.warn('[TraceEnhancer] Failed to get memory metrics:', memError);
        metrics.memoryMB = -1; // Показываем что была ошибка
      }
    } catch (error) {
      console.warn('[TraceEnhancer] Ошибка получения метрик производительности:', error);
    }

    return metrics;
  }

  /**
   * Парсит состояние сети из числового значения
   */
  private static parseNetworkState(networkState: number): string {
    // Appium network connection constants
    const states = {
      0: 'None',
      1: 'Airplane Mode',
      2: 'Wifi Only',
      4: 'Data Only',
      6: 'All Network On',
    };
    return states[networkState as keyof typeof states] || `Unknown (${networkState})`;
  }

  /**
   * Форматирует всю собранную информацию в читаемый отчет
   */
  static formatDebugReport(debugInfo: DebugInfo): string {
    const formatValue = (value: any, defaultValue = 'недоступно') => {
      if (value === undefined || value === null || value === 'unknown') return defaultValue;
      if (value === 'adb_error') return 'ошибка adb';
      return value;
    };

    const batteryText = debugInfo.systemInfo?.batteryLevel
      ? `${debugInfo.systemInfo.batteryLevel}%`
      : formatValue(debugInfo.systemInfo?.batteryLevel);

    const memoryText =
      debugInfo.performanceMetrics?.memoryMB !== undefined
        ? debugInfo.performanceMetrics.memoryMB === -1
          ? 'ошибка получения'
          : `${debugInfo.performanceMetrics.memoryMB}MB`
        : 'недоступно';

    const lines = [
      '=== ОТЛАДОЧНАЯ ИНФОРМАЦИЯ ===',
      `Время: ${debugInfo.timestamp}`,
      `Тест: ${debugInfo.testName}`,
      `Ошибка: ${debugInfo.error}`,
      '',
    ];

    // Добавляем информацию об элементе, если есть
    if (debugInfo.elementInfo) {
      lines.push('=== ИНФОРМАЦИЯ ОБ ЭЛЕМЕНТЕ ===');
      if (debugInfo.elementInfo.selector) {
        lines.push(`Селектор: ${debugInfo.elementInfo.selector}`);
      }
      if (debugInfo.elementInfo.method) {
        lines.push(`Метод: ${debugInfo.elementInfo.method}`);
      }
      if (debugInfo.elementInfo.elementDetails) {
        lines.push(`Детали элемента: ${debugInfo.elementInfo.elementDetails}`);
      }
      lines.push('');
    }

    lines.push(
      '=== КОНТЕКСТ ПРИЛОЖЕНИЯ ===',
      `Activity: ${formatValue(debugInfo.appContext?.currentActivity)}`,
      `Package: ${formatValue(debugInfo.appContext?.currentPackage)}`,
      `Сеть: ${formatValue(debugInfo.appContext?.networkConnectivity)}`,
      '',
      '=== СИСТЕМНАЯ ИНФОРМАЦИЯ ===',
      `Устройство: ${formatValue(debugInfo.systemInfo?.deviceModel)}`,
      `Android: ${formatValue(debugInfo.systemInfo?.androidVersion)}`,
      `Батарея: ${batteryText}`,
      `Память приложения: ${memoryText}`,
      '',
      '=== ПАМЯТЬ УСТРОЙСТВА ===',
      formatValue(debugInfo.systemInfo?.memoryUsage, 'Информация о памяти недоступна'),
      '',
      '=== СТАТУС СБОРА ДАННЫХ ===',
      `UI Hierarchy: ${debugInfo.uiHierarchy ? 'получена' : 'ошибка'}`,
      `Логи приложения: ${debugInfo.filteredLogs ? 'получены' : 'ошибка'}`,
      `Системная информация: ${debugInfo.systemInfo ? 'частично получена' : 'ошибка'}`,
    );

    return lines.join('\n');
  }
}
