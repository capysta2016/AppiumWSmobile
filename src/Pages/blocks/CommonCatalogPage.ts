import BasePage from '../BasePage';
import { $ } from '@wdio/globals';

// CommonCatalogPage
// Класс-обёртка для повторно используемых элементов каталогов/списков (например,
// выбор счёта "Основной" в различных формах). Цель — не дублировать локаторы в
// нескольких Page Object'ах (WealthPage, Income/Expense и т.д.).
const selectors: Record<string, string> = {
  // Элемент списка (карточка) счёта с признаком "Основной" (content-desc содержит слово "Основной")
  mainAccountItem: '//android.view.ViewGroup[contains(@content-desc, "Основной")]',
};

class CommonCatalogPage extends BasePage {
  [key: string]: any; // Позволяет обращаться к динамически созданным геттерам как к свойствам экземпляра

  // Нажатие на элемент счёта "Основной" (используется при выборе счёта для операций)
  async tapMainAccountItem() {
    await this.click(this.mainAccountItem);
  }
}

// Динамически создаём геттеры для каждого локатора из объекта selectors.
// Это унифицирует доступ: this.mainAccountItem возвращает $(locator) при каждом обращении.
for (const [name, selector] of Object.entries(selectors)) {
  Object.defineProperty(CommonCatalogPage.prototype, name, {
    get() {
      if (selector.startsWith('#')) {
        return $(selector);
      }
      return $(selector);
    },
  });
}

export default new CommonCatalogPage();
