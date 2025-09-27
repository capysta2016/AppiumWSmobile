/*
 * Универсальные утилиты скролла для мобильных тестов.
 * Поддерживает стратегию:
 * 1. nativeScrollGesture (Appium mobile: scrollGesture) если доступно
 * 2. Fallback: W3C pointer swipe (performActions)
 * 3. Определение достижения края через сравнение хэшей pageSource (SHA1) с ограничением попыток
 * 4. Доп. функция scrollUntilVisible(selector) с защитой от зависания
 */
import crypto from 'crypto';
import { browser } from '@wdio/globals';

export type ScrollDirection = 'up' | 'down';

interface ScrollOptions {
  maxSwipes?: number; // Максимум свайпов до отказа
  pauseAfterSwipeMs?: number; // Пауза после свайпа
  edgeStabilityRepeats?: number; // Сколько одинаковых хэшей подряд считать краем
  // Процентные координаты начала/конца свайпа (от 0 до 1)
  startRatioYDown?: number; // для свайпа вверх (контент вниз)
  endRatioYDown?: number;
  startRatioYUp?: number; // для свайпа вниз (контент вверх)
  endRatioYUp?: number;
}

const DEFAULT_OPTS: Required<ScrollOptions> = {
  maxSwipes: 12,
  pauseAfterSwipeMs: 550,
  edgeStabilityRepeats: 2,
  startRatioYDown: 0.75,
  endRatioYDown: 0.25,
  startRatioYUp: 0.25,
  endRatioYUp: 0.75,
};

function sha1(text: string): string {
  return crypto.createHash('sha1').update(text).digest('hex');
}

interface NativeScrollResult {
  attempted: boolean; // Был ли вызван mobile: scrollGesture
  moved: boolean; // Произошло ли фактическое движение (true) или дошли до края (false)
  rectUsed?: { left: number; top: number; width: number; height: number };
  error?: string;
}

async function tryNativeScroll(direction: ScrollDirection): Promise<NativeScrollResult> {
  try {
    // Попытка найти реальный scrollable контейнер, чтобы точнее задать область
    let rect: { left: number; top: number; width: number; height: number } | null = null;
    try {
      const scrollableEl = await $('-android uiautomator: new UiSelector().scrollable(true)');
      if (await (scrollableEl as any).isExisting()) {
        const r = await (scrollableEl as any).getRect();
        // Иногда scrollable элемент за пределами экрана (редко), поэтому проверим разумные размеры
        if (r && r.width > 0 && r.height > 0) {
          rect = { left: r.x, top: r.y, width: r.width, height: r.height };
        }
      }
    } catch (_) {
      // игнорируем — fallback к окну
    }

    if (!rect) {
      const { width, height } = await browser.getWindowSize();
      rect = {
        left: Math.round(width * 0.05),
        top: Math.round(height * 0.12),
        width: Math.round(width * 0.9),
        height: Math.round(height * 0.76),
      };
    }

    const scrolled = await browser.execute('mobile: scrollGesture', {
      ...rect,
      direction: direction === 'up' ? 'up' : 'down',
      percent: 0.85,
    });
    // В Appium boolean результат: true = движение было, false = край
    return { attempted: true, moved: !!scrolled, rectUsed: rect };
  } catch (e) {
    const err = e as Error;
    return { attempted: false, moved: false, error: err?.message };
  }
}

async function w3cSwipe(direction: ScrollDirection, opts: Required<ScrollOptions>) {
  const { width, height } = await browser.getWindowSize();
  const actions =
    direction === 'up'
      ? { startY: height * opts.startRatioYDown, endY: height * opts.endRatioYDown }
      : { startY: height * opts.startRatioYUp, endY: height * opts.endRatioYUp };

  await browser.performActions([
    {
      type: 'pointer',
      id: 'finger1',
      parameters: { pointerType: 'touch' },
      actions: [
        {
          type: 'pointerMove',
          duration: 0,
          x: Math.round(width * 0.5),
          y: Math.round(actions.startY),
        },
        { type: 'pointerDown', button: 0 },
        { type: 'pause', duration: 80 },
        {
          type: 'pointerMove',
          duration: 600,
          x: Math.round(width * 0.5),
          y: Math.round(actions.endY),
        },
        { type: 'pointerUp', button: 0 },
      ],
    },
  ]);
  await browser.releaseActions();
}

export async function swipe(
  direction: ScrollDirection,
  options?: ScrollOptions & { debug?: boolean },
) {
  const opts = { ...DEFAULT_OPTS, ...options } as Required<ScrollOptions> & { debug?: boolean };
  const nativeResult = await tryNativeScroll(direction);
  if (opts.debug) {
    console.log(
      `[scroll][swipe] direction=${direction} native.attempted=${nativeResult.attempted} native.moved=${nativeResult.moved}` +
        (nativeResult.rectUsed ? ` rect=${JSON.stringify(nativeResult.rectUsed)}` : '') +
        (nativeResult.error ? ` error=${nativeResult.error}` : ''),
    );
  }
  // Если mobile:scrollGesture не поддерживается (attempted=false с error) — используем W3C свайп
  if (!nativeResult.attempted) {
    await w3cSwipe(direction, opts);
    if (opts.debug) console.log('[scroll][swipe] fallback=w3cSwipe');
  }
  // Если attempted=true и moved=false — мы у края. НЕ выполняем дополнительный свайп, чтобы избежать "отката".
}

export async function scrollToEdge(direction: ScrollDirection, options?: ScrollOptions) {
  const opts = { ...DEFAULT_OPTS, ...options } as Required<ScrollOptions>;
  let stableRepeats = 0;

  for (let i = 0; i < opts.maxSwipes; i++) {
    // Сначала делаем свайп
    const before = await browser.getPageSource();
    await swipe(direction, opts);
    await browser.pause(opts.pauseAfterSwipeMs);
    const after = await browser.getPageSource();
    const hashBefore = sha1(before);
    const hashAfter = sha1(after);
    if (hashAfter === hashBefore) {
      stableRepeats += 1;
    } else {
      stableRepeats = 0;
    }
    if (stableRepeats >= opts.edgeStabilityRepeats) return; // достигли края
  }
}

export async function scrollUntilVisible(
  selector: string | WebdriverIO.Element,
  direction: ScrollDirection,
  options?: ScrollOptions & { timeoutMs?: number },
): Promise<boolean> {
  const opts = { ...DEFAULT_OPTS, ...options } as Required<ScrollOptions> & { timeoutMs?: number };
  const timeout = options?.timeoutMs ?? 10000;
  const startTime = Date.now();

  async function resolveElement(sel: string | WebdriverIO.Element): Promise<WebdriverIO.Element> {
    if (typeof sel === 'string') {
      const el = await $(sel);
      return el as unknown as WebdriverIO.Element; // приведение для согласования типов
    }
    return sel as WebdriverIO.Element;
  }

  for (let i = 0; i < opts.maxSwipes && Date.now() - startTime < timeout; i++) {
    const el = await resolveElement(selector);
    try {
      if (await (el as any).isExisting()) {
        const displayed = await (el as any).isDisplayed();
        if (displayed) return true;
      }
    } catch (_) {
      // игнорируем, продолжим скроллить
    }
    await swipe(direction, opts);
    await browser.pause(opts.pauseAfterSwipeMs);
  }
  return false;
}

/**
 * Высокоуровневый helper: прокрутить до элемента и нажать, если виден во вьюпорте.
 * Возвращает true если клик совершен.
 */
export async function scrollAndTap(
  selector: string,
  direction: ScrollDirection = 'up',
  options?: ScrollOptions & { timeoutMs?: number; debug?: boolean },
): Promise<boolean> {
  const visible = await scrollUntilVisible(selector, direction, options);
  if (!visible) return false;
  const el = await $(selector);
  try {
    // Дополнительная проверка видимости внутри viewport, если поддерживается
    const inViewport = (el as any).isDisplayedInViewport
      ? await (el as any).isDisplayedInViewport()
      : await (el as any).isDisplayed();
    if (!inViewport) return false;
    await (el as any).click();
    return true;
  } catch (e) {
    if (options?.debug) console.log('[scroll][scrollAndTap] click failed:', (e as any)?.message);
    return false;
  }
}

export default {
  swipe,
  scrollToEdge,
  scrollUntilVisible,
  scrollAndTap,
};
