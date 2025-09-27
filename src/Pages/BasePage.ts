// Базовый Page Object: упрощён до стандартных методов ожидания и взаимодействия.
// По запросу удалены расширенные ретраи (safeClick) и жестовые fallback'и.
import type { ChainablePromiseElement } from 'webdriverio';
import { $ } from '@wdio/globals';
import ScrollHelper from '../utils/scrollHelper';

export default class BasePage {
  async waitForElement(
    selectorOrElement: string | ChainablePromiseElement,
    timeout = 20000,
  ): Promise<ChainablePromiseElement> {
    const element =
      typeof selectorOrElement === 'string' ? $(selectorOrElement) : selectorOrElement;
    try {
      await element.waitForExist({
        timeout,
        interval: 500,
        timeoutMsg: `Элемент не найден: ${
          typeof selectorOrElement === 'string' ? selectorOrElement : '<element>'
        }`,
      });
      await element.waitForDisplayed({
        timeout,
        interval: 500,
        timeoutMsg: `Элемент не отображается: ${
          typeof selectorOrElement === 'string' ? selectorOrElement : '<element>'
        }`,
      });
      await browser.waitUntil(async () => await element.isEnabled(), {
        timeout: timeout / 2,
        interval: 300,
        timeoutMsg: `Элемент не активен: ${
          typeof selectorOrElement === 'string' ? selectorOrElement : '<element>'
        }`,
      });
      await browser.pause(150);
      return element;
    } catch (err) {
      const sel = typeof selectorOrElement === 'string' ? selectorOrElement : '<element>';
      throw new Error(`waitForElement: ${sel} не готов. ${(err as Error)?.message || err}`);
    }
  }

  async isElementDisplayed(selector: string, timeout = 7000): Promise<boolean> {
    try {
      const element = $(selector);
      await element.waitForExist({ timeout, interval: 500 });
      return await element.waitForDisplayed({ timeout, interval: 500 });
    } catch {
      return false;
    }
  }

  async click(selectorOrElement: string | ChainablePromiseElement, timeout = 20000) {
    const selector = typeof selectorOrElement === 'string' ? selectorOrElement : '<element>';
    const element =
      typeof selectorOrElement === 'string'
        ? await this.waitForElement(selectorOrElement, timeout)
        : await selectorOrElement;

    try {
      await browser.waitUntil(
        async () => (await element.isDisplayed()) && (await element.isEnabled()),
        {
          timeout: Math.min(timeout / 2, 7000),
          interval: 300,
          timeoutMsg: 'Элемент не кликабелен',
        },
      );
      await element.click();
      await browser.pause(250);
      return element;
    } catch (error) {
      // Собираем дополнительную информацию об элементе
      const elementInfo = await this.getElementDebugInfo(element, selector);
      const enhancedError = new Error(
        `Click failed for element "${selector}" in method "click"\n` +
          `Element info: ${elementInfo}\n` +
          `Original error: ${(error as Error).message}`,
      );
      (enhancedError as any).selector = selector;
      (enhancedError as any).method = 'click';
      (enhancedError as any).elementInfo = elementInfo;
      throw enhancedError;
    }
  }

  async setValue(
    selectorOrElement: string | ChainablePromiseElement,
    value: string | number,
    timeout = 20000,
  ) {
    const selector = typeof selectorOrElement === 'string' ? selectorOrElement : '<element>';
    const element =
      typeof selectorOrElement === 'string'
        ? await this.waitForElement(selectorOrElement, timeout)
        : await selectorOrElement;

    try {
      await browser.waitUntil(
        async () => (await element.isDisplayed()) && (await element.isEnabled()),
        { timeout: timeout / 2, interval: 300, timeoutMsg: 'Элемент не готов для ввода' },
      );
      await element.click();
      await browser.pause(200);
      await element.setValue(value.toString());
      await browser.pause(200);
      await driver.keys(['Enter']);
      await browser.pause(200);
      return element;
    } catch (error) {
      // Собираем дополнительную информацию об элементе
      const elementInfo = await this.getElementDebugInfo(element, selector);
      const enhancedError = new Error(
        `SetValue failed for element "${selector}" in method "setValue"\n` +
          `Value: "${value}"\n` +
          `Element info: ${elementInfo}\n` +
          `Original error: ${(error as Error).message}`,
      );
      (enhancedError as any).selector = selector;
      (enhancedError as any).method = 'setValue';
      (enhancedError as any).elementInfo = elementInfo;
      throw enhancedError;
    }
  }

  async typeDigits(
    selectorOrElement: string | ChainablePromiseElement,
    value: number | string,
    timeout = 20000,
  ) {
    const selector = typeof selectorOrElement === 'string' ? selectorOrElement : '<element>';
    const element =
      typeof selectorOrElement === 'string'
        ? await this.waitForElement(selectorOrElement, timeout)
        : await selectorOrElement;

    try {
      await browser.waitUntil(
        async () => (await element.isDisplayed()) && (await element.isEnabled()),
        { timeout: timeout / 2, interval: 300, timeoutMsg: 'Элемент не готов для ввода цифр' },
      );
      await element.click();
      await browser.pause(150);
      for (const digit of value.toString()) {
        await driver.keys([digit]);
        await browser.pause(120);
      }
      await driver.keys(['Enter']);
      await browser.pause(200);
      return element;
    } catch (error) {
      // Собираем дополнительную информацию об элементе
      const elementInfo = await this.getElementDebugInfo(element, selector);
      const enhancedError = new Error(
        `TypeDigits failed for element "${selector}" in method "typeDigits"\n` +
          `Value: "${value}"\n` +
          `Element info: ${elementInfo}\n` +
          `Original error: ${(error as Error).message}`,
      );
      (enhancedError as any).selector = selector;
      (enhancedError as any).method = 'typeDigits';
      (enhancedError as any).elementInfo = elementInfo;
      throw enhancedError;
    }
  }

  async blurActiveElement() {
    await driver.keys(['Enter']);
    await browser.pause(200);
  }

  /**
   * Собирает отладочную информацию об элементе для улучшения отчетов об ошибках
   */
  private async getElementDebugInfo(
    element: ChainablePromiseElement,
    selector: string,
  ): Promise<string> {
    const info: string[] = [];

    try {
      info.push(`Selector: "${selector}"`);

      // Проверяем основные свойства элемента
      try {
        const isDisplayed = await element.isDisplayed();
        info.push(`isDisplayed: ${isDisplayed}`);
      } catch (e) {
        info.push(`isDisplayed: error - ${(e as Error).message}`);
      }

      try {
        const isEnabled = await element.isEnabled();
        info.push(`isEnabled: ${isEnabled}`);
      } catch (e) {
        info.push(`isEnabled: error - ${(e as Error).message}`);
      }

      try {
        const isClickable = await element.isClickable();
        info.push(`isClickable: ${isClickable}`);
      } catch (e) {
        info.push(`isClickable: error - ${(e as Error).message}`);
      }

      // Получаем размеры и позицию
      try {
        const location = await element.getLocation();
        const size = await element.getSize();
        info.push(
          `Rect: x=${location.x}, y=${location.y}, width=${size.width}, height=${size.height}`,
        );
      } catch (e) {
        info.push(`Rect: error - ${(e as Error).message}`);
      }

      // Получаем текст элемента
      try {
        const text = await element.getText();
        info.push(`Text: "${text}"`);
      } catch (e) {
        info.push(`Text: error - ${(e as Error).message}`);
      }

      // Получаем атрибуты
      try {
        const attributes = await browser.execute((el) => {
          const result: Record<string, string> = {};
          for (let i = 0; i < el.attributes.length; i++) {
            const attr = el.attributes[i];
            result[attr.name] = attr.value;
          }
          return result;
        }, element);
        info.push(`Attributes: ${JSON.stringify(attributes)}`);
      } catch (e) {
        info.push(`Attributes: error - ${(e as Error).message}`);
      }
    } catch (error) {
      info.push(`General element info error: ${(error as Error).message}`);
    }

    return info.join('; ');
  }

  /**
   * Скроллит до элемента и кликает по нему
   * Использует новый надёжный ScrollHelper
   */
  async scrollAndClick(
    selector: string,
    direction: 'up' | 'down' = 'down',
    debug: boolean = false,
  ): Promise<boolean> {
    try {
      const result = await ScrollHelper.scrollAndClick(selector, direction, { debug });
      if (!result) {
        // Если элемент не найден, добавляем информацию в ошибку
        const error = new Error(
          `ScrollAndClick failed: element "${selector}" not found after scrolling ${direction}`,
        );
        (error as any).selector = selector;
        (error as any).method = 'scrollAndClick';
        (error as any).direction = direction;
        throw error;
      }
      return result;
    } catch (error) {
      // Если это наша ошибка, пробрасываем дальше
      if ((error as any).selector) {
        throw error;
      }
      // Иначе оборачиваем в нашу ошибку
      const enhancedError = new Error(
        `ScrollAndClick failed for element "${selector}" in method "scrollAndClick"\n` +
          `Direction: ${direction}\n` +
          `Original error: ${(error as Error).message}`,
      );
      (enhancedError as any).selector = selector;
      (enhancedError as any).method = 'scrollAndClick';
      (enhancedError as any).direction = direction;
      throw enhancedError;
    }
  }

  /**
   * Скроллит до элемента и возвращает true если элемент найден
   */
  async scrollToElement(
    selector: string,
    direction: 'up' | 'down' = 'down',
    debug: boolean = false,
  ): Promise<boolean> {
    try {
      const result = await ScrollHelper.scrollToElement(selector, direction, { debug });
      if (!result) {
        // Если элемент не найден, добавляем информацию в ошибку
        const error = new Error(
          `ScrollToElement failed: element "${selector}" not found after scrolling ${direction}`,
        );
        (error as any).selector = selector;
        (error as any).method = 'scrollToElement';
        (error as any).direction = direction;
        throw error;
      }
      return result;
    } catch (error) {
      // Если это наша ошибка, пробрасываем дальше
      if ((error as any).selector) {
        throw error;
      }
      // Иначе оборачиваем в нашу ошибку
      const enhancedError = new Error(
        `ScrollToElement failed for element "${selector}" in method "scrollToElement"\n` +
          `Direction: ${direction}\n` +
          `Original error: ${(error as Error).message}`,
      );
      (enhancedError as any).selector = selector;
      (enhancedError as any).method = 'scrollToElement';
      (enhancedError as any).direction = direction;
      throw enhancedError;
    }
  }

  /**
   * Прокрутка до края (верх/низ) экрана или scrollable контейнера.
   * Используется в тестах: await LoginPage.scrollToEdge('up');
   * direction: 'up' — к началу (top), 'down' — к концу (bottom).
   * options.maxSwipes можно ограничить, debug=true даст подробный лог.
   */
  async scrollToEdge(direction: 'up' | 'down', options?: { maxSwipes?: number; debug?: boolean }) {
    const maxAttempts = options?.maxSwipes || 10;
    const debug = options?.debug || false;

    if (debug)
      console.log(`[BasePage] scrollToEdge ${direction} начинаем, maxAttempts=${maxAttempts}`);

    // Если maxSwipes <= 5, используем простой scrollBySteps для гарантированного результата
    if (maxAttempts <= 5) {
      if (debug)
        console.log(`[BasePage] Используем scrollBySteps вместо scrollToEdge для надёжности`);
      await this.scrollBySteps(direction, maxAttempts, debug);
      return;
    }

    if (direction === 'up') {
      await ScrollHelper.scrollToTop({
        maxAttempts,
        debug,
      });
    } else {
      await ScrollHelper.scrollToBottom({
        maxAttempts,
        debug,
      });
    }
  }

  /**
   * Выполняет указанное количество свайпов в заданном направлении
   * Полезно для точного позиционирования
   */
  async scrollBySteps(direction: 'up' | 'down', steps: number, debug: boolean = false) {
    await ScrollHelper.scrollBySteps(direction, steps, { debug });
  }
}
