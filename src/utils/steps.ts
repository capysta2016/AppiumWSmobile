import allure from '@wdio/allure-reporter';
import { browser } from '@wdio/globals';

interface StepOptions {
  screenshot?: boolean; // force screenshot
  name?: string; // override name (else passed label)
}

const inlineScreenshots = process.env.INLINE_STEP_SCREENSHOTS !== 'false';

export async function runStep<T>(
  label: string,
  fn: () => Promise<T>,
  opts: StepOptions = {},
): Promise<T> {
  const name = opts.name || label;
  let started = false;
  try {
    // @ts-ignore
    allure.startStep(name);
    started = true;
  } catch (e) {
    console.warn('[runStep] Не удалось вызвать startStep, продолжим без оформления шага:', e);
  }
  try {
    const result = await fn();
    if (inlineScreenshots && opts.screenshot !== false) {
      try {
        // @ts-ignore
        const png = await browser.takeScreenshot();
        // @ts-ignore
        allure.addAttachment(`📸 ${name}`, Buffer.from(png, 'base64'), 'image/png');
      } catch (e) {
        console.warn('[runStep] screenshot failed', e);
      }
    }
    if (started) {
      try {
        // @ts-ignore
        allure.endStep('passed');
      } catch (e) {
        console.warn('[runStep] endStep(passed) failed:', e);
      }
    }
    return result;
  } catch (e) {
    if (inlineScreenshots) {
      try {
        // @ts-ignore
        const png = await browser.takeScreenshot();
        // @ts-ignore
        allure.addAttachment(`📸 FAILED ${name}`, Buffer.from(png, 'base64'), 'image/png');
      } catch {}
    }
    if (started) {
      try {
        // @ts-ignore
        allure.endStep('failed');
      } catch (ee) {
        console.warn('[runStep] endStep(failed) failed:', ee);
      }
    }
    throw e;
  }
}
