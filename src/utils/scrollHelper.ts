/**
 * ScrollHelper - надёжная утилита для скролла в Appium тестах
 *
 * Принципы:
 * 1. Простота - минимальное количество стратегий
 * 2. Надёжность - проверенные подходы для реальных устройств и эмуляторов
 * 3. Универсальность - работает с любыми элементами
 * 4. Отладочность - понятные логи при необходимости
 */

import { browser } from '@wdio/globals';

interface ScrollOptions {
  /** Максимальное количество попыток скролла */
  maxAttempts?: number;
  /** Пауза между попытками скролла (мс) */
  pauseBetween?: number;
  /** Показывать отладочную информацию */
  debug?: boolean;
  /** Таймаут для поиска элемента (мс) */
  timeout?: number;
}

const DEFAULT_OPTIONS: Required<ScrollOptions> = {
  maxAttempts: 10,
  pauseBetween: 500,
  debug: false,
  timeout: 5000,
};

class ScrollHelper {
  private static async getScreenSize() {
    return await browser.getWindowSize();
  }

  private static log(message: string, debug: boolean = false) {
    if (debug) {
      console.log(`[ScrollHelper] ${message}`);
    }
  }

  /**
   * Выполняет один свайп в указанном направлении
   * Использует простую W3C стратегию с проверенными координатами
   */
  private static async performSwipe(
    direction: 'up' | 'down',
    debug: boolean = false,
  ): Promise<void> {
    try {
      const { width, height } = await this.getScreenSize();

      // Безопасные координаты для свайпа (избегаем краёв экрана)
      const centerX = Math.round(width * 0.5);
      const startY = direction === 'up' ? Math.round(height * 0.7) : Math.round(height * 0.3);
      const endY = direction === 'up' ? Math.round(height * 0.3) : Math.round(height * 0.7);

      this.log(`Performing swipe ${direction}: ${centerX},${startY} -> ${centerX},${endY}`, debug);

      await browser.performActions([
        {
          type: 'pointer',
          id: 'finger1',
          parameters: { pointerType: 'touch' },
          actions: [
            { type: 'pointerMove', duration: 0, x: centerX, y: startY },
            { type: 'pointerDown', button: 0 },
            { type: 'pause', duration: 100 },
            { type: 'pointerMove', duration: 600, x: centerX, y: endY },
            { type: 'pointerUp', button: 0 },
          ],
        },
      ]);

      await browser.releaseActions();
      this.log(`Swipe ${direction} completed`, debug);
    } catch (error) {
      this.log(`Swipe ${direction} failed: ${(error as Error).message}`, debug);
      throw error;
    }
  }

  /**
   * Скроллит до самого верха экрана
   * Выполняет несколько свайпов вверх до достижения края
   */
  static async scrollToTop(options: ScrollOptions = {}): Promise<void> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    this.log('Starting scroll to top', opts.debug);

    let stableCount = 0; // Счётчик стабильных состояний

    for (let i = 0; i < opts.maxAttempts; i++) {
      try {
        const beforeSource = await browser.getPageSource();
        await this.performSwipe('up', opts.debug);
        await browser.pause(opts.pauseBetween);

        const afterSource = await browser.getPageSource();

        // Если содержимое не изменилось - увеличиваем счётчик стабильности
        if (beforeSource === afterSource) {
          stableCount++;
          this.log(`Stable count: ${stableCount}/2 after ${i + 1} swipes`, opts.debug);

          // Если 2 раза подряд не было изменений - считаем что достигли края
          if (stableCount >= 2) {
            this.log(`Reached top after ${i + 1} swipes (stable)`, opts.debug);
            return;
          }
        } else {
          stableCount = 0; // Сбрасываем счётчик при обнаружении изменений
        }
      } catch (error) {
        this.log(`Scroll to top attempt ${i + 1} failed: ${(error as Error).message}`, opts.debug);
      }
    }

    this.log(`Scroll to top completed after ${opts.maxAttempts} attempts`, opts.debug);
  }

  /**
   * Скроллит до самого низа экрана
   * Выполняет несколько свайпов вниз до достижения края
   */
  static async scrollToBottom(options: ScrollOptions = {}): Promise<void> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    this.log('Starting scroll to bottom', opts.debug);

    let stableCount = 0; // Счётчик стабильных состояний

    for (let i = 0; i < opts.maxAttempts; i++) {
      try {
        const beforeSource = await browser.getPageSource();
        await this.performSwipe('down', opts.debug);
        await browser.pause(opts.pauseBetween);

        const afterSource = await browser.getPageSource();

        // Если содержимое не изменилось - увеличиваем счётчик стабильности
        if (beforeSource === afterSource) {
          stableCount++;
          this.log(`Stable count: ${stableCount}/2 after ${i + 1} swipes`, opts.debug);

          // Если 2 раза подряд не было изменений - считаем что достигли края
          if (stableCount >= 2) {
            this.log(`Reached bottom after ${i + 1} swipes (stable)`, opts.debug);
            return;
          }
        } else {
          stableCount = 0; // Сбрасываем счётчик при обнаружении изменений
        }
      } catch (error) {
        this.log(
          `Scroll to bottom attempt ${i + 1} failed: ${(error as Error).message}`,
          opts.debug,
        );
      }
    }

    this.log(`Scroll to bottom completed after ${opts.maxAttempts} attempts`, opts.debug);
  }

  /**
   * Выполняет указанное количество свайпов в заданном направлении
   * Полезно для точного позиционирования
   */
  static async scrollBySteps(
    direction: 'up' | 'down',
    steps: number,
    options: ScrollOptions = {},
  ): Promise<void> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    this.log(`Starting scroll ${direction} for ${steps} steps`, opts.debug);

    for (let i = 0; i < steps; i++) {
      try {
        await this.performSwipe(direction, opts.debug);
        await browser.pause(opts.pauseBetween);
        this.log(`Completed step ${i + 1}/${steps}`, opts.debug);
      } catch (error) {
        this.log(`Scroll step ${i + 1} failed: ${(error as Error).message}`, opts.debug);
        throw error;
      }
    }

    this.log(`Scroll by steps completed: ${steps} ${direction}`, opts.debug);
  }

  /**
   * Скроллит до появления указанного элемента на экране
   * Возвращает true если элемент найден, false если не найден после всех попыток
   */
  static async scrollToElement(
    selector: string,
    direction: 'up' | 'down' = 'down',
    options: ScrollOptions = {},
  ): Promise<boolean> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    this.log(`Starting scroll to element: ${selector} in direction ${direction}`, opts.debug);

    // Сначала проверим, не виден ли элемент уже
    try {
      const element = await $(selector);
      await element.waitForExist({ timeout: 1000 });
      if (await element.isDisplayed()) {
        this.log(`Element already visible: ${selector}`, opts.debug);
        return true;
      }
    } catch {
      // Элемент не найден или не виден, продолжаем поиск
    }

    // Скроллим до появления элемента
    for (let i = 0; i < opts.maxAttempts; i++) {
      try {
        await this.performSwipe(direction, opts.debug);
        await browser.pause(opts.pauseBetween);

        // Проверяем появление элемента
        try {
          const element = await $(selector);
          await element.waitForExist({ timeout: 1000 });

          if (await element.isDisplayed()) {
            this.log(`Element found after ${i + 1} swipes: ${selector}`, opts.debug);
            return true;
          }
        } catch {
          // Элемент всё ещё не найден, продолжаем
          this.log(`Element not found on attempt ${i + 1}: ${selector}`, opts.debug);
        }
      } catch (error) {
        this.log(`Scroll attempt ${i + 1} failed: ${(error as Error).message}`, opts.debug);
      }
    }

    this.log(`Element not found after ${opts.maxAttempts} attempts: ${selector}`, opts.debug);
    return false;
  }

  /**
   * Скроллит до элемента и кликает по нему
   * Возвращает true если успешно кликнул, false если элемент не найден
   */
  static async scrollAndClick(
    selector: string,
    direction: 'up' | 'down' = 'down',
    options: ScrollOptions = {},
  ): Promise<boolean> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    this.log(`Starting scroll and click: ${selector}`, opts.debug);

    const found = await this.scrollToElement(selector, direction, opts);

    if (!found) {
      this.log(`Cannot click - element not found: ${selector}`, opts.debug);
      return false;
    }

    try {
      const element = await $(selector);
      await element.waitForExist({ timeout: opts.timeout });
      await element.waitForDisplayed({ timeout: opts.timeout });
      await element.click();

      this.log(`Successfully clicked element: ${selector}`, opts.debug);
      return true;
    } catch (error) {
      this.log(`Click failed for element ${selector}: ${(error as Error).message}`, opts.debug);
      return false;
    }
  }
}

export default ScrollHelper;
