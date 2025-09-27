import BasePage from '../BasePage';
import { $ } from '@wdio/globals';
// --- New dependencies for asset creation flow ---
import CommonCatalogPage from './CommonCatalogPage';
import DatePickerPage from './DatePickerPage';
import IncomeExpensePage from './IncomeExpensePage';

// Благосостояние
const selectors: Record<string, string> = {
  // --- Благосостояние ---
  rectViewElement:
    '(//android.widget.ScrollView)[2]//android.view.ViewGroup/android.view.ViewGroup/android.view.ViewGroup[3]',
  obligationTypeButton: 'android=new UiSelector().description("Обязательство")',
  investmentTypeInput: '~Тип инвестиции',
  autoLoanCategoryButton: '~Автокредит',
  loanCategoryButton: '~Займ',
  investmentDepositAccountInput: '~Счёт зачисления средств',
  debitAccountButton: '~Счёт списания средств',
  periodicPaymentTypeButton: '~Периодичный',
  incomeAmountInputField: 'id=income',
  frequencyInput: '~Периодичность',
  monthlyFrequencyButton: '~Месяц',
  creditAmountContainer: '~Сумма кредита',
  paymentTypeInput: '~Тип выплат',
  paymentAmountContainer: '~Сумма платежа',
  startDateAndTimeInput: '~Дата и время начала',
  accountButton: '-android uiautomator: new UiSelector().text("Счёт")',
  typeInput: '~Тип счёта',
  bankType: '~Банковский',
  undefinedInput: '-android uiautomator: new UiSelector().resourceId("undefined").instance(0)',
  bankInput: '~Название банка',
  sberbankButton: '~СберБанк',
  subAccountNameElement:
    '-android uiautomator: new UiSelector().resourceId("undefined").instance(1)',
  balanceInput: '-android uiautomator: new UiSelector().text("0")',
  createAccountButton: '~Создать счет',
  incomeEntryButton:
    '-android uiautomator: new UiSelector().className("android.view.ViewGroup").instance(11)',
  endDateAndTimeInput: '~Дата и время завершения',

  // Создание Инвестиционного Актива
  investmentGroupInput: '~Группа инвестиции',
  assetClassificationInput: '~Классификация', // (если понадобится позже)
  assetTypeInput: '~Тип актива',
  acquisitionMethodInput: '~Способ приобретения актива',
  // Поле выбора счёта покупки
  purchaseAccountInput: 'android=new UiSelector().description("Счёт покупки")',
  purchasePriceInput: 'id=buy_sum',
  purchasePriceContainer: 'android=new UiSelector().description("Цена покупки")',
  purchaseDateTimeInput: '~Дата и время покупки', // допущение (может отличаться в реальном UI)
  createAssetButton: '~Создать',
  // Опции выпадающих списков (точечные)
  investmentTypeApartmentOption: 'android=new UiSelector().description("Квартира")',
  investmentGroupRealEstateOption: 'android=new UiSelector().description("Недвижимость")',
  assetTypePersonalOption: 'android=new UiSelector().description("Личный актив")',
  acquisitionMethodPurchaseOption: 'android=new UiSelector().description("Покупка")',
  // Простая карточка выбора операции "Актив"
  assetButton: 'android=new UiSelector().description("Актив")',
  assetNameContainer: 'android=new UiSelector().description("Название")',
  assetDescriptionContainer: 'android=new UiSelector().description("Описание")',
  comment: 'android=new UiSelector().resourceId("comment")',
  // =========================================================================================
};

class WealthPage extends BasePage {
  [key: string]: any;
  // --- Универсальные действия ---
  // Нажать на плитку "+" (открытие формы выбора типа операции)
  async tapRectView() {
    await this.click(this.rectViewElement);
  }
  // Выбрать тип операции "Счёт"
  async tapAccountButton() {
    await this.click(this.accountButton);
  }
  // Открыть список типов счетов
  async tapTypeInput() {
    await this.click(this.typeInput);
  }
  // Выбрать тип счёта "Банковский"
  async tapBankType() {
    await this.click(this.bankType);
  }
  // Открыть поле выбора банка
  async tapBankInput() {
    await this.click(this.bankInput);
  }
  // Выбрать банк "СберБанк" из каталога
  async tapSberbank() {
    await this.click(this.sberbankButton);
  }
  // Выбрать тип операции "Обязательство"
  async tapObligationType() {
    await this.click(this.obligationTypeButton);
  }
  // Открыть выбор типа инвестиции
  async tapInvestmentType() {
    await this.click(this.investmentTypeInput);
  }
  // Выбрать категорию инвестиции "Автокредит"
  async tapAutoLoanCategory() {
    await this.click(this.autoLoanCategoryButton);
  }
  // Выбрать категорию инвестиции "Займ"
  async tapLoanCategory() {
    await this.click(this.loanCategoryButton);
  }
  // Открыть выбор счёта зачисления средств
  async tapInvestmentDepositAccount() {
    await this.click(this.investmentDepositAccountInput);
  }
  // Открыть выбор счёта списания средств
  async tapDebitAccountButton() {
    await this.click(this.debitAccountButton);
  }
  // Выбрать тип выплат "Периодичный"
  async tapPeriodicPaymentType() {
    await this.click(this.periodicPaymentTypeButton);
  }
  // Открыть выбор периодичности
  async tapFrequency() {
    await this.click(this.frequencyInput);
  }
  // Выбрать период "Месяц"
  async tapMonthlyFrequency() {
    await this.click(this.monthlyFrequencyButton);
  }
  // Клик и ввод суммы кредита
  async tapCreditAmountContainer(amount: number) {
    await this.click(this.creditAmountContainer);
    await this.typeDigits(this.creditAmountContainer, amount);
  }
  // Открыть выбор типа выплат
  async tapPaymentType() {
    await this.click(this.paymentTypeInput);
  }
  // Клик и ввод суммы платежа
  async tapPaymentAmountContainer(amount: number) {
    await this.click(this.paymentAmountContainer);
    await this.typeDigits(this.paymentAmountContainer, amount);
  }
  // Открыть выбор даты начала
  async tapStartDateAndTime() {
    await this.click(this.startDateAndTimeInput);
  }
  // Нажать на элемент (возврат/закрытие) из формы (incomeEntryButton)
  async tapIncomeEntryButton() {
    await this.click(this.incomeEntryButton);
  }
  // Нажать кнопку создания счёта
  async tapCreateButton() {
    await this.click(this.createAccountButton);
  }
  // Открыть выбор даты завершения
  async tapEndDateAndTime() {
    await this.click(this.endDateAndTimeInput);
  }

  // --- Ввод данных ---
  async setUndefinedInputText(text: string) {
    await this.setValue(this.undefinedInput, text);
  }
  // Ввести название суб-счёта
  async setSubAccountNameText(text: string) {
    await this.setValue(this.subAccountNameElement, text);
  }
  // Ввести баланс счёта
  async setBalance(amount: number) {
    await this.typeDigits(this.balanceInput, amount);
  }
  // Ввести сумму дохода
  async setIncomeAmountField(amount: number) {
    await this.typeDigits(this.incomeAmountInputField, amount);
  }
  // Ввести сумму кредита (дубль метода ввода через typeDigits)
  async setCreditAmount(amount: number) {
    await this.typeDigits(this.creditAmountContainer, amount);
  }
  // Ввести сумму платежа (дубль ввода через typeDigits)
  async setPaymentAmount(amount: number) {
    await this.typeDigits(this.paymentAmountContainer, amount);
  }
  // Проверка отображения счета в Благосостоянии
  async verifyAccountDisplayed(accountName: string, accountAmount: number) {
    const formattedAmount = accountAmount.toLocaleString('ru-RU');
    const accountElement = $(`~Account ${accountName}`);
    await accountElement.waitForExist({ timeout: 15000 });
    await accountElement.waitForDisplayed({ timeout: 15000 });

    const nameElement = accountElement.$(`android=new UiSelector().text("${accountName}")`);
    await nameElement.waitForExist({ timeout: 5000 });
    await nameElement.waitForDisplayed({ timeout: 5000 });

    const textViews = await accountElement.$$(`android.widget.TextView`);
    let foundAmount = false;
    for (const tv of textViews) {
      let text = await tv.getText();
      text = text.replace(/\s|\u00A0/g, '');
      if (text.startsWith(formattedAmount.replace(/\s/g, '')) && /[₽РP]$/i.test(text)) {
        foundAmount = true;
        break;
      }
    }
    if (!foundAmount) {
      throw new Error(`Сумма аккаунта не найдена: ожидалось "${formattedAmount} ₽/Р"`);
    }
    return true;
  }
  // Проверяет, что в блоке "Автокредит" отображается корректный остаток и счетчик платежей
  async verifyAutoLoanObligation(expectedCreditAmount: number, expectedPaymentAmount: number) {
    // Остаток после двух платежей
    const expectedLeft = expectedCreditAmount - 2 * expectedPaymentAmount;
    const formattedLeft = `- ${expectedLeft.toLocaleString('ru-RU')} ₽`;
    const expectedCounter = '2 / 38';
    // Находим элемент по descriptionStartsWith("Автокредит")
    const autoLoanElement = await $('android=new UiSelector().descriptionStartsWith("Автокредит")');
    await autoLoanElement.waitForExist({ timeout: 15000 });
    await autoLoanElement.waitForDisplayed({ timeout: 15000 });
    const contentDesc = await autoLoanElement.getAttribute('contentDescription');
    console.log('[DEBUG] verifyAutoLoanObligation: content-desc =', contentDesc);
    // Проверяем наличие остатка и счетчика
    if (!contentDesc.includes(formattedLeft)) {
      throw new Error(
        `Ожидался остаток по кредиту "${formattedLeft}" в content-desc, но найдено: "${contentDesc}"`,
      );
    }
    if (!contentDesc.includes(expectedCounter)) {
      throw new Error(
        `Ожидался счетчик платежей "${expectedCounter}" в content-desc, но найдено: "${contentDesc}"`,
      );
    }
    console.log('[DEBUG] verifyAutoLoanObligation: проверка прошла успешно');
    return true;
  }

  // МЕТОДЫ: Создание Инвестиционного Актива
  async tapAssetButton() {
    await this.click(this.assetButton);
  }
  // Выбрать тип инвестиции Квартира
  async tapInvestmentTypeApartment() {
    await this.click(this.investmentTypeInput);
    await this.click(this.investmentTypeApartmentOption);
  }
  // Выбрать группу инвестиции Недвижимость
  async tapInvestmentGroupRealEstate() {
    await this.click(this.investmentGroupInput);
    await this.click(this.investmentGroupRealEstateOption);
  }
  // Выбрать тип актива Личный актив
  async tapAssetTypePersonal() {
    await this.click(this.assetTypeInput);
    await this.click(this.assetTypePersonalOption);
  }
  // Выбрать способ приобретения Покупка
  async tapAcquisitionMethodPurchase() {
    await this.click(this.acquisitionMethodInput);
    await this.click(this.acquisitionMethodPurchaseOption);
  }

  async setAssetName(name: string) {
    // 1. Клик по контейнеру (он видимый по description "Название")
    let containerEl;
    try {
      containerEl = await this.click(this.assetNameContainer);
    } catch (e) {
      console.log('[assetName] container click fail:', (e as Error).message);
    }

    // 2. Попытка найти поле по основному id
    const candidateSelectors = [
      'android=new UiSelector().resourceIdMatches(".*name.*")',
      'android=new UiSelector().className("android.widget.EditText").focused(true)',
    ];

    // target как any чтобы не спорить с типами ChainablePromiseElement в рантайме
    let target: any;
    for (const sel of candidateSelectors) {
      try {
        const el = await $(sel);
        if (await el.isExisting()) {
          if ((await el.isDisplayed().catch(() => false)) || sel.includes('focused')) {
            target = el as any;
            console.log('[assetName] using selector:', sel);
            break;
          }
        }
      } catch {}
    }

    // 3. Если ничего не нашли — пробуем сам контейнер как поле ввода
    if (!target && containerEl) {
      target = containerEl as unknown as WebdriverIO.Element;
      console.log('[assetName] fallback to container element');
    }

    if (!target) {
      throw new Error('[assetName] не удалось найти поле ввода (id=name/EditText)');
    }

    // 4. Очистка и ввод
    try {
      await target.click();
      await browser.pause(80);
      await target.clearValue();
    } catch (e) {
      console.log('[assetName] clearValue fail (ok):', (e as Error).message);
    }
    try {
      await target.setValue(name);
    } catch (e) {
      console.log('[assetName] direct setValue failed, try keys:', (e as Error).message);
      for (const ch of name.split('')) {
        await driver.keys([ch]);
        await browser.pause(50);
      }
    }
    await browser.pause(150);

    // 5. Валидация — если текст пустой, ещё одна попытка через driver.keys
    try {
      const txt = (await target.getText())?.trim();
      if (!txt) {
        console.log('[assetName] getText() пусто, повторяю ввод через keys');
        await target.click();
        await browser.pause(80);
        for (const ch of name.split('')) {
          await driver.keys([ch]);
          await browser.pause(50);
        }
      }
    } catch {}
  }

  async setAssetDescription(description: string) {
    let containerEl;
    try {
      containerEl = await this.click(this.assetDescriptionContainer);
    } catch (e) {
      console.log('[assetDesc] container click fail:', (e as Error).message);
    }

    const candidateSelectors = [
      'android=new UiSelector().resourceIdMatches(".*comment.*")',
      'android=new UiSelector().className("android.widget.EditText").focused(true)',
    ];

    let target: any;
    for (const sel of candidateSelectors) {
      try {
        const el = await $(sel);
        if (await el.isExisting()) {
          if ((await el.isDisplayed().catch(() => false)) || sel.includes('focused')) {
            target = el as any;
            console.log('[assetDesc] using selector:', sel);
            break;
          }
        }
      } catch {}
    }
    if (!target && containerEl) {
      target = containerEl as unknown as WebdriverIO.Element;
      console.log('[assetDesc] fallback to container element');
    }
    if (!target) {
      throw new Error('[assetDesc] не удалось найти поле ввода (id=comment/EditText)');
    }
    try {
      await target.click();
      await browser.pause(80);
      await target.clearValue();
    } catch (e) {
      console.log('[assetDesc] clearValue fail (ok):', (e as Error).message);
    }
    try {
      await target.setValue(description);
    } catch (e) {
      console.log('[assetDesc] direct setValue failed, try keys:', (e as Error).message);
      for (const ch of description.split('')) {
        await driver.keys([ch]);
        await browser.pause(50);
      }
    }
    await browser.pause(150);
    try {
      const txt = (await target.getText())?.trim();
      if (!txt) {
        console.log('[assetDesc] getText() пусто, повторяю ввод через keys');
        await target.click();
        await browser.pause(80);
        for (const ch of description.split('')) {
          await driver.keys([ch]);
          await browser.pause(50);
        }
      }
    } catch {}
  }

  async setObligationDescription(description: string) {
    await this.setValue(this.comment, description);
  }

  async setPurchaseAccountMain() {
    // legacy метод – оставлен временно для обратной совместимости, но заменён на два шага
    await this.tapPurchaseAccount();
    await this.chooseMainAccountForPurchase();
  }

  // Открыть выбор "Счёт покупки"
  async tapPurchaseAccount() {
    await this.click(this.purchaseAccountInput);
  }

  async chooseMainAccountForPurchase() {
    await CommonCatalogPage.tapMainAccountItem();
  }
  // Ввести сумму покупки актива
  async setPurchasePrice(amount: number) {
    // Упрощённый ввод: один поиск EditText, одна очистка, ввод цифрами, быстрая валидация
    await this.click(this.purchasePriceContainer).catch(() => {});

    const candidateSelectors = [
      'android=new UiSelector().resourceId("buy_sum")',
      'android=new UiSelector().className("android.widget.EditText").focused(true)',
    ];

    let target: any;
    for (const sel of candidateSelectors) {
      try {
        const el = await $(sel);
        if (await el.isExisting()) {
          if ((await el.isDisplayed().catch(() => false)) || sel.includes('focused')) {
            target = el;
            break;
          }
        }
      } catch {}
    }
    if (!target) throw new Error('[purchasePrice] поле не найдено');

    try {
      await target.click();
      await browser.pause(60);
      await target.clearValue();
    } catch {}

    const digits = amount.toString();
    // Ввод через keys — самый стабильный для числовых полей с форматированием
    try {
      await target.setValue(digits);
    } catch {
      for (const d of digits) {
        await driver.keys([d]);
        await browser.pause(50);
      }
    }
    await browser.pause(120);

    // Быстрая валидация: сравниваем только цифры
    try {
      const txt = (await target.getText())?.replace(/\D/g, '');
      if (txt !== digits) {
        await target.click().catch(() => {});
        // Повторный ввод через keys поверх
        for (const ch of digits) {
          await driver.keys([ch]);
          await browser.pause(40);
        }
      }
    } catch {}
  }
  // Установка даты покупки
  async setPurchaseDateThreeMonthsAgo() {
    await this.click(this.purchaseDateTimeInput);
    await DatePickerPage.selectCurrentDate();
    await DatePickerPage.tapPreviousMonthThreeTimes();
    await DatePickerPage.selectDayInCalendar();
    await DatePickerPage.clickOkButton();
    await IncomeExpensePage.tapDoneButton();
  }
  // Нажать кнопку создания актива
  async tapCreateAssetButton() {
    await this.click(this.createAssetButton);
  }
}

for (const [name, selector] of Object.entries(selectors)) {
  Object.defineProperty(WealthPage.prototype, name, {
    get() {
      if (selector.startsWith('#')) {
        return $(selector);
      }
      return $(selector);
    },
  });
}

export default new WealthPage();
