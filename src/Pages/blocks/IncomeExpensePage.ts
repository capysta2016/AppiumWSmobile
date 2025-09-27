import BasePage from '../BasePage';
import { $ } from '@wdio/globals';

// Доходы и расходы
const selectors: Record<string, string> = {
  // --- Доходы и расходы ---
  expenseTypeButton: '~Расход',
  purchaseAmountInput: '~Дата',
  doneButton: '~Готово',
  incomeAmountInput: '~Сумма дохода',
  expenseAmountInput: '~Сумма расхода',
  operationTypeInput: '~Категория',
  salaryCategoryItem: '~Заработная плата',
  productsCategoryButton: '~Продукты',
  subcategoryInput: '#subcategory-id',
  incomeAccountInput: '~Счет зачисления',
  expenseAccountInput: '~Счет списания',
  commentContainer: '~Описание',
  commentInput: '#comment',
  mainIncomeCheckbox: '~Основной доход',
  createButton: '~Создать',
  okButton: '//android.widget.Button[@resource-id="android:id/button1"]',
  datePickerYearHeader:
    '//android.widget.TextView[@resource-id="android:id/date_picker_header_year"]',
};

class IncomeExpensePage extends BasePage {
  [key: string]: any;
  // --- Действия ---
  async tapExpenseType() {
    await this.click(this.expenseTypeButton);
  }
  async tapDoneButton() {
    await this.click(this.doneButton);
  }
  async tapCreateButton() {
    await this.click(this.createButton);
  }
  async tapProductsCategory() {
    await this.click(this.productsCategoryButton);
  }
  async tapSalaryCategory() {
    await this.click(this.salaryCategoryItem);
  }
  async tapOperationTypeInput() {
    await this.click(this.operationTypeInput);
  }
  async tapExpenseAccountInput() {
    await this.click(this.expenseAccountInput);
  }
  async tapIncomeAccountInput() {
    await this.click(this.incomeAccountInput);
  }
  async tapPurchaseAmountInput() {
    await this.click(this.purchaseAmountInput);
  }

  // --- Ввод значений ---
  async setIncomeAmount(amount: number) {
    await this.typeDigits(this.incomeAmountInput, amount);
  }
  async setExpenseAmount(amount: number) {
    await this.typeDigits(this.expenseAmountInput, amount);
  }

  // --- Чекбоксы ---
  async toggleMainIncomeCheckbox() {
    await this.click(this.mainIncomeCheckbox);
  }
}

for (const [name, selector] of Object.entries(selectors)) {
  Object.defineProperty(IncomeExpensePage.prototype, name, {
    get() {
      if (selector.startsWith('#')) {
        return $(selector);
      }
      return $(selector);
    },
  });
}

export default new IncomeExpensePage();
