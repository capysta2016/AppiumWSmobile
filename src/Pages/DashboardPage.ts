import BasePage from './BasePage';
import { $ } from '@wdio/globals';

const selectors = {
  // --- Дашборд ---
  addButton: '~Добавить',
  wealthSection: 'android=new UiSelector().descriptionStartsWith("Благосостояние")',
  incomeRectView:
    '//android.view.ViewGroup[contains(@content-desc, "Доходы и расходы")]/android.view.ViewGroup[1]/com.horcrux.svg.SvgView',
  incomeExpenseSection: 'android=new UiSelector().descriptionStartsWith("Доходы и расходы")',
  previousMonthButton: '~Previous month',
};

class DashboardPage extends BasePage {
  // --- Универсальные действия ---
  async tapAddButton() {
    await this.click(this.addButton);
  }
  async tapIncomeRectView() {
    await this.click(this.incomeRectView);
  }
  async tapIncomeExpenseSection() {
    await this.click(this.incomeExpenseSection);
  }
  async tapWealthSection() {
    await this.click(this.wealthSection);
  }
  async tapPreviousMonthThreeTimes() {
    for (let i = 0; i < 3; i++) {
      await this.click(this.previousMonthButton);
      await browser.pause(1000);
    }
  }

  // Проверка, что в блоке "Доходы и расходы" отображается определённая сумма дохода
  async verifyIncomeBlockHasAmount(expectedAmount: number) {
    const formattedAmount = `+ ${expectedAmount.toLocaleString('ru-RU')} ₽`;
    // Находим блок "Доходы и расходы"
    const incomeBlock = $('android=new UiSelector().descriptionContains("Доходы и расходы")');
    await incomeBlock.waitForExist({ timeout: 15000 });
    await incomeBlock.waitForDisplayed({ timeout: 15000 });

    // Ищем все TextView внутри блока
    const textViews = (await incomeBlock.$$(
      `android.widget.TextView`,
    )) as unknown as WebdriverIO.Element[];
    // Ищем первое вхождение "Дох. " и берём следующий элемент с плюсом
    let found = false;
    for (let i = 0; i < textViews.length - 1; i++) {
      const label = await textViews[i].getText();
      const value = await textViews[i + 1].getText();
      if (
        label.trim() === 'Дох.' &&
        value.replace(/\s|\u00A0/g, '') === formattedAmount.replace(/\s/g, '')
      ) {
        found = true;
        break;
      }
    }
    if (!found) {
      throw new Error(
        `Сумма дохода "${formattedAmount}" не найдена среди реальных значений в блоке Доходы и расходы`,
      );
    }
    return true;
  }
  // Проверка, что в блоке "Доходы и расходы" отображается определённая сумма расхода
  async verifyExpenseBlockHasAmount(expectedAmount: number) {
    const formattedAmount = `- ${expectedAmount.toLocaleString('ru-RU')} ₽`;
    // Находим блок "Доходы и расходы"
    const expenseBlock = $('android=new UiSelector().descriptionContains("Доходы и расходы")');
    await expenseBlock.waitForExist({ timeout: 15000 });
    await expenseBlock.waitForDisplayed({ timeout: 15000 });

    // Ищем все TextView внутри блока
    const textViews = (await expenseBlock.$$(
      `android.widget.TextView`,
    )) as unknown as WebdriverIO.Element[];
    // Ищем первое вхождение "Расх." и берём следующий элемент с минусом
    let found = false;
    for (let i = 0; i < textViews.length - 1; i++) {
      const label = await textViews[i].getText();
      const value = await textViews[i + 1].getText();
      if (
        label.trim() === 'Расх.' &&
        value.replace(/\s|\u00A0/g, '') === formattedAmount.replace(/\s/g, '')
      ) {
        found = true;
        break;
      }
    }
    if (!found) {
      throw new Error(
        `Сумма расхода "${formattedAmount}" не найдена среди реальных значений в блоке Доходы и расходы`,
      );
    }
    return true;
  }
  // Проверка, что в блоке "Благосостояние" отображается определённая сумма
  async verifyWealthBlockHasAmount(expectedAmount: number) {
    const formattedAmount = expectedAmount.toLocaleString('ru-RU') + ' ₽';
    // Находим блок "Благосостояние"
    const wealthBlock = $('android=new UiSelector().descriptionStartsWith("Благосостояние")');
    await wealthBlock.waitForExist({ timeout: 15000 });
    await wealthBlock.waitForDisplayed({ timeout: 15000 });

    // Ищем все TextView с нужной суммой внутри блока
    const textViews = await wealthBlock.$$(`android.widget.TextView`);
    let found = false;
    for (const tv of textViews) {
      const text = await tv.getText();
      if (text.replace(/\s|\u00A0/g, '') === formattedAmount.replace(/\s/g, '')) {
        found = true;
        break;
      }
    }
    if (!found) {
      throw new Error(`Сумма "${formattedAmount}" не найдена в блоке Благосостояние`);
    }
    return true;
  }
  // Переключение на предыдущий месяц в графике (XPath внутри блока)
  async tapPreviousMonthOnChart() {
    // Ищем кнопку через UiSelector по instance(21)
    const button = $(
      '//android.view.ViewGroup[contains(@content-desc, "Доходы и расходы")]/android.view.ViewGroup[2]',
    );
    await button.waitForExist({ timeout: 10000 });
    await button.waitForDisplayed({ timeout: 10000 });
    await button.click();
    await browser.pause(10000); // ожидание обновления
  }
  // Проверка расхода в графике за месяц (поиск только внутри блока)
  async verifyChartExpenseHasAmount(expectedAmount: number) {
    const formattedAmount = `- ${expectedAmount.toLocaleString('ru-RU')} ₽`;
    console.log('[DEBUG] verifyChartExpenseHasAmount: formattedAmount =', formattedAmount);
    // Находим блок "Доходы и расходы"
    const expenseBlock = await $(
      'android=new UiSelector().descriptionContains("Доходы и расходы")',
    );
    console.log('[DEBUG] verifyChartExpenseHasAmount: expenseBlock найден, ждем отображения...');
    await expenseBlock.waitForExist({ timeout: 15000 });
    await expenseBlock.waitForDisplayed({ timeout: 15000 });
    console.log('[DEBUG] verifyChartExpenseHasAmount: expenseBlock отображен');

    // Ищем все TextView внутри блока
    const textViews = (await expenseBlock.$$(
      `android.widget.TextView`,
    )) as unknown as WebdriverIO.Element[];
    console.log('[DEBUG] verifyChartExpenseHasAmount: найдено textViews =', textViews.length);
    let found = false;
    for (let i = 0; i < textViews.length - 1; i++) {
      const label = await textViews[i].getText();
      const value = await textViews[i + 1].getText();
      console.log(`[DEBUG] textView[${i}]: label = '${label}', value = '${value}'`);
      // Сравниваем с учётом пробелов и неразрывных пробелов
      if (
        label.trim() === 'Расх.' &&
        value.replace(/\s|\u00A0/g, '') === formattedAmount.replace(/\s/g, '')
      ) {
        found = true;
        console.log('[DEBUG] verifyChartExpenseHasAmount: совпадение найдено!');
        break;
      }
    }
    if (!found) {
      console.log('[DEBUG] verifyChartExpenseHasAmount: совпадение не найдено, бросаем ошибку');
      throw new Error(
        `Сумма расхода "${formattedAmount}" не найдена среди реальных значений в блоке Доходы и расходы`,
      );
    }
    console.log('[DEBUG] verifyChartExpenseHasAmount: успешно завершено');
    return true;
  }

  [key: string]: any;
}

for (const [name, selector] of Object.entries(selectors)) {
  Object.defineProperty(DashboardPage.prototype, name, {
    get() {
      if (selector.startsWith('#')) {
        return $(selector);
      }
      return $(selector);
    },
  });
}

export default new DashboardPage();
