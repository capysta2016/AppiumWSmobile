import { browser } from '@wdio/globals';
import allure from '@wdio/allure-reporter';

export async function attachScreenshot(name: string) {
  const screenshot = await browser.takeScreenshot();
  allure.addAttachment(name, Buffer.from(screenshot, 'base64'), 'image/png');
}
