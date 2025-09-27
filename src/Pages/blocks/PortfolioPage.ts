import BasePage from '../BasePage';
import { $ } from '@wdio/globals';

// PortfolioPage (Экран "Портфель")
// Назначение: работа с агрегированным списком активов / инвестиций.
// Здесь обычно отображаются:
//  - Общая стоимость портфеля
//  - Список активов (карточки)
//  - Фильтры / вкладки (Напр. Все / Активы / Обязательства / Доходность)
//  - Кнопка добавления нового актива / операции
// Страница пока заглушка — добавлены шаблонные локаторы (TODO) и примерные методы.

const selectors: Record<string, string> = {
  // TODO: portfolioTotalValue: 'android=new UiSelector().description("Итог портфеля")',
  // TODO: addOperationButton: 'android=new UiSelector().description("Добавить")',
  // TODO: assetsTab: 'android=new UiSelector().description("Активы")',
  // TODO: obligationsTab: 'android=new UiSelector().description("Обязательства")',
  // TODO: performanceTab: 'android=new UiSelector().description("Доходность")',
};

class PortfolioPage extends BasePage {
  [key: string]: any; // динамические геттеры для selectors

  // ================== ДИНАМИЧЕСКИЕ ЛОКАТОРЫ (ГЕНЕРАТОРЫ) ==================
  // Карточка актива по названию (если content-desc содержит имя)
  assetCardByName(name: string) {
    return $(`//android.view.ViewGroup[contains(@content-desc, "${name}")]`);
  }

  // ================== ПРИМЕРНЫЕ ДЕЙСТВИЯ (РАСКОММЕНТИРОВАТЬ ПРИ НАЛИЧИИ UI) ==================
  // async tapAddOperation() {
  //   await this.click(this.addOperationButton);
  // }

  // async openAssetsTab() {
  //   await this.click(this.assetsTab);
  // }

  // async openObligationsTab() {
  //   await this.click(this.obligationsTab);
  // }

  // async openPerformanceTab() {
  //   await this.click(this.performanceTab);
  // }

  // async verifyPortfolioTotal(expected: number) {
  //   const el = await this.portfolioTotalValue;
  //   const text = (await el.getAttribute('contentDescription')) || (await el.getText());
  //   // Простой пример проверки (аккуратно с форматированием пробелов):
  //   const digits = text.replace(/[^0-9]/g, '');
  //   if (digits !== expected.toString()) {
  //     throw new Error(`Ожидалась сумма портфеля ${expected}, найдено: ${text}`);
  //   }
  // }

  // async verifyAssetPresent(name: string) {
  //   const card = this.assetCardByName(name);
  //   await card.waitForExist({ timeout: 10000 });
  //   await card.waitForDisplayed({ timeout: 10000 });
  // }
  // =======================================================================
}

// Динамическая генерация геттеров под каждый локатор из selectors
for (const [name, selector] of Object.entries(selectors)) {
  Object.defineProperty(PortfolioPage.prototype, name, {
    get() {
      if (selector.startsWith('#')) {
        return $(selector);
      }
      return $(selector);
    },
  });
}

export default new PortfolioPage();
