// tests/first-test.ts
import { attachScreenshot } from '../src/utils/reportUtils';
import { stepSS } from '../src/utils/stepHelper';
import { addTestMeta } from '../src/helpers/data/testMeta';
import LoginPage from '../src/Pages/LoginPage';
import DashboardPage from '../src/Pages/DashboardPage';
import WealthPage from '../src/Pages/blocks/WealthPage';
import IncomeExpensePage from '../src/Pages/blocks/IncomeExpensePage';
import CommonCatalogPage from '../src/Pages/blocks/CommonCatalogPage';
import DatePickerPage from '../src/Pages/blocks/DatePickerPage';
import EmailHelper from '../src/helpers/email/EmailHelper';
import TestDataManager from '../src/helpers/data/TestDataManager';
import { prepareApp } from '../src/helpers/prepare/prepareApp';
import { faker } from '@faker-js/faker';

describe('WS mobile tests', () => {
  it('Регистрация владельца', async () => {
    TestDataManager.clearData('owner');
    const ownerData = TestDataManager.getTestData('owner');
    if (!ownerData || !('password' in ownerData)) {
      throw new Error('Данные владельца отсутствуют или некорректны');
    }

    let code;
    addTestMeta({ type: 'registration', ownerData });

    // Подготовка среды
    await prepareApp(driver, LoginPage, attachScreenshot);

    await stepSS('Нажать кнопку Регистрация', async () => {
      await LoginPage.tapRegistrationButton();
      await LoginPage.emailInput.waitForDisplayed({ timeout: 15000 });
    });
    await stepSS('Ввести email, пароль и подтверждение пароля', async () => {
      await LoginPage.setEmail(ownerData.email);
      await LoginPage.setPassword(ownerData.password);
      await LoginPage.setConfirmPassword(ownerData.password);
    });
    await stepSS('Нажать Зарегистрироваться', async () => {
      await LoginPage.tapSubmitRegistrationButton();
      await LoginPage.confirmationCodeInput.waitForDisplayed({ timeout: 15000 });
    });
    await stepSS('Получить и ввести код из email', async () => {
      code = await EmailHelper.getWaitEmailCode(ownerData.email);
      await LoginPage.setConfirmationCode(code);
    });
    await stepSS('Нажать Подтвердить', async () => {
      await LoginPage.tapConfirmButton();
    });

    TestDataManager.saveData('owner', ownerData);

    await stepSS('Выход из системы', async () => {
      await browser.pause(5000);
      await LoginPage.tapBackButton();
      await browser.pause(3000);
      await LoginPage.scrollToEdge('up');
      await LoginPage.tapLogoutButton();
    });
  });

  it('Авторизация владельца', async () => {
    const ownerData = TestDataManager.getTestData('owner');
    if (!ownerData || !('password' in ownerData)) {
      throw new Error('Данные владельца отсутствуют или некорректны');
    }

    // ИСКУССТВЕННОЕ ПАДЕНИЕ ДЛЯ ПРОВЕРКИ РЕКАВЕРИ
    throw new Error('Force fail');

    addTestMeta({ type: 'login', ownerData });

    await prepareApp(driver, LoginPage, attachScreenshot);

    await stepSS('Ввести email и пароль и нажать "Войти"', async () => {
      await LoginPage.loginWithCredentials(ownerData!.email, ownerData!.password);
    });
    await stepSS('Выход из системы', async () => {
      await browser.pause(5000);
      await LoginPage.tapBackButton();
      await browser.pause(3000);
      await LoginPage.scrollToEdge('up');
      await LoginPage.tapLogoutButton();
    });
  });

  it('Восстановление пароля', async () => {
    const ownerData = TestDataManager.getTestData('owner');
    if (!ownerData || !('password' in ownerData)) {
      throw new Error('Данные владельца отсутствуют или некорректны');
    }

    const newPassword = `Secure${faker.internet.password({ length: 12 })}!`;
    let code;
    ownerData.password = newPassword;

    addTestMeta({ type: 'recovery', ownerData });

    await prepareApp(driver, LoginPage, attachScreenshot);

    await stepSS('Нажать "Забыли пароль?"', async () => {
      await LoginPage.tapForgotPasswordLink();
    });
    await stepSS('Ввести email', async () => {
      await LoginPage.setEmailForgot(ownerData.email);
    });
    await stepSS('Нажать "Отправить код"', async () => {
      await LoginPage.tapSendCodeButton();
    });
    await stepSS('Ввести код из email', async () => {
      code = await EmailHelper.getWaitEmailCode(ownerData.email, 'recovery');
      await LoginPage.setVerificationCode(code);
    });
    await stepSS('Ввести новый пароль', async () => {
      await LoginPage.setNewPassword(ownerData.password);
    });
    await stepSS('Подтвердить новый пароль', async () => {
      await LoginPage.setConfirmNewPassword(ownerData.password);
    });
    await stepSS('Нажать "Сохранить"', async () => {
      await LoginPage.scrollToEdge('up');
      await LoginPage.tapSaveButton();
    });

    TestDataManager.updateOwnerPassword(newPassword);

    await stepSS('Проверить авторизацию с новым паролем', async () => {
      await LoginPage.loginWithCredentials(ownerData!.email, ownerData!.password);
    });
    await stepSS('Выход из системы', async () => {
      await browser.pause(5000);
      await LoginPage.tapBackButton();
      await browser.pause(3000);
      await LoginPage.scrollToEdge('up');
      await LoginPage.tapLogoutButton();
    });
  });

  it('Создание банковского счета', async () => {
    const ownerData = TestDataManager.getTestData('owner');
    if (!ownerData || !('password' in ownerData)) {
      throw new Error('Данные владельца отсутствуют или некорректны');
    }

    const accountName = 'СберБанкЗП';
    const accountAmount = 10000;
    const bankName = 'СберБанк';
    const subAccount = 'Основной';

    addTestMeta({ type: 'account', accountName, accountAmount, bankName, ownerData });

    // Подготовка среды
    await prepareApp(driver, LoginPage, attachScreenshot);

    await stepSS('Ввести email и пароль и нажать "Войти"', async () => {
      await LoginPage.loginWithCredentials(ownerData.email, ownerData.password);
    });

    await stepSS('Нажать кнопку Добавить в Благосостоянии', async () => {
      await DashboardPage.tapAddButton();
    });
    await stepSS('Нажать плюс', async () => {
      await WealthPage.tapRectView();
    });
    await stepSS('Выбрать "Счет"', async () => {
      await WealthPage.tapAccountButton();
    });
    await stepSS('Нажать на Тип счета', async () => {
      await WealthPage.tapTypeInput();
    });
    await stepSS('Выбрать "Банковский"', async () => {
      await WealthPage.tapBankType();
    });
    await stepSS('Ввести название счета', async () => {
      await WealthPage.setUndefinedInputText(accountName);
    });
    await stepSS('Нажать на Название банка', async () => {
      await WealthPage.tapBankInput();
    });
    await stepSS('Выбор банка из списка', async () => {
      await WealthPage.tapSberbank();
    });
    await stepSS('Ввести название субсчета', async () => {
      await WealthPage.setSubAccountNameText(subAccount);
    });
    await stepSS('Ввести сумму', async () => {
      await WealthPage.setBalance(accountAmount);
    });
    await stepSS('Нажать Создать счет', async () => {
      await WealthPage.tapCreateButton();
      await browser.pause(5000);
    });
    await stepSS('Проверить создание счета в Благосостоянии', async () => {
      await WealthPage.verifyAccountDisplayed(accountName, accountAmount);
    });
    await stepSS('Нажать Назад', async () => {
      await WealthPage.tapIncomeEntryButton();
    });
    await stepSS('Проверить создание счета на главной странице', async () => {
      await DashboardPage.verifyWealthBlockHasAmount(accountAmount);
    });
    await stepSS('Выход из системы', async () => {
      await browser.pause(5000);
      await LoginPage.tapBackButton();
      await browser.pause(3000);
      await LoginPage.scrollToEdge('up');
      await LoginPage.tapLogoutButton();
    });
  });

  it('Добавление дохода', async () => {
    const ownerData = TestDataManager.getTestData('owner');
    if (!ownerData || !('password' in ownerData)) {
      throw new Error('Данные владельца отсутствуют или некорректны');
    }

    const incomeAmount = 100000;
    const accountAmount = 10000; // сумма, которая была создана в тесте создания счета
    const expectedWealthAmount = accountAmount + incomeAmount;
    const incomeCategory = 'Заработная плата';
    const incomeAccount = 'Основной';
    const incomeComment = 'Первая ЗП';

    addTestMeta({
      type: 'income',
      incomeAmount,
      incomeCategory,
      incomeAccount,
      incomeComment,
      accountAmount,
      expectedWealthAmount,
      ownerData,
    });

    // Подготовка среды
    await prepareApp(driver, LoginPage, attachScreenshot);

    await stepSS('Ввести email и пароль и нажать "Войти"', async () => {
      await LoginPage.loginWithCredentials(ownerData.email, ownerData.password);
    });
    await stepSS('Открыть форму добавления дохода', async () => {
      await DashboardPage.tapIncomeRectView();
    });
    await stepSS('Нажать на выбор Даты', async () => {
      await IncomeExpensePage.tapPurchaseAmountInput();
    });
    await stepSS('Подтвердить выбор даты', async () => {
      await IncomeExpensePage.tapDoneButton();
    });
    await stepSS('Ввести сумму дохода', async () => {
      await IncomeExpensePage.setIncomeAmount(incomeAmount);
    });
    await stepSS('Открыть выбор категории', async () => {
      await IncomeExpensePage.tapOperationTypeInput();
    });
    await stepSS('Выбрать категорию', async () => {
      await IncomeExpensePage.tapSalaryCategory();
    });
    await stepSS('Открыть выбор Счет зачисления', async () => {
      await IncomeExpensePage.tapIncomeAccountInput();
    });
    await stepSS('Выбрать счет зачисления', async () => {
      await CommonCatalogPage.tapMainAccountItem();
    });
    await stepSS('Выбрать чекбокс "Основной доход"', async () => {
      await IncomeExpensePage.toggleMainIncomeCheckbox();
    });
    await stepSS('Подтвердить создание дохода — нажать "Создать"', async () => {
      await IncomeExpensePage.tapCreateButton();
      await driver.pause(3000);
    });
    await stepSS('Проверить сумму дохода в блоке "Доходы и расходы"', async () => {
      await DashboardPage.verifyIncomeBlockHasAmount(incomeAmount);
    });
    await stepSS('Проверить сумму в блоке "Благосостояние" после дохода', async () => {
      await DashboardPage.verifyWealthBlockHasAmount(expectedWealthAmount);
    });
    await stepSS('Выход из системы', async () => {
      await LoginPage.tapBackButton();
      await browser.pause(3000);
      await LoginPage.scrollToEdge('up');
      await LoginPage.tapLogoutButton();
      await browser.pause(3000);
    });
  });

  it('Добавление расхода', async () => {
    const ownerData = TestDataManager.getTestData('owner');
    if (!ownerData || !('password' in ownerData)) {
      throw new Error('Данные владельца отсутствуют или некорректны');
    }

    const expenseAmount = 7500;
    const expenseCategory = 'Продукты';
    const expenseAccount = 'Основной';
    const expenseComment = 'Покупка в магазине';

    // исходные суммы из предыдущих тестов
    const accountAmount = 10000;
    const incomeAmount = 100000;
    const expectedWealthAmount = accountAmount + incomeAmount - expenseAmount;

    addTestMeta({
      type: 'expense',
      expenseAmount,
      expenseCategory,
      expenseAccount,
      expenseComment,
      accountAmount,
      incomeAmount,
      expectedWealthAmount,
      ownerData,
    });

    // Подготовка среды
    await prepareApp(driver, LoginPage, attachScreenshot);

    await stepSS('Ввести email и пароль и нажать "Войти"', async () => {
      await LoginPage.loginWithCredentials(ownerData.email, ownerData.password);
    });

    await stepSS('Открыть форму добавления дохода и расхода', async () => {
      await DashboardPage.tapIncomeRectView();
    });
    await stepSS('Нажать кнопку Расход', async () => {
      await IncomeExpensePage.tapExpenseType();
    });
    await stepSS('Нажать на выбор Даты', async () => {
      await IncomeExpensePage.tapPurchaseAmountInput();
    });
    await stepSS('Подтвердить выбор даты', async () => {
      await IncomeExpensePage.tapDoneButton();
    });
    await stepSS('Ввести сумму расхода', async () => {
      await IncomeExpensePage.setExpenseAmount(expenseAmount);
    });
    await stepSS('Открыть выбор категории', async () => {
      await IncomeExpensePage.tapOperationTypeInput();
    });
    await stepSS('Выбрать категорию "Продукты"', async () => {
      await IncomeExpensePage.tapProductsCategory();
    });
    await stepSS('Открыть выбор Счета списания', async () => {
      await IncomeExpensePage.tapExpenseAccountInput();
    });
    await stepSS('Выбрать счёт списания', async () => {
      await CommonCatalogPage.tapMainAccountItem();
    });
    await stepSS('Подтвердить создание расхода — нажать "Создать"', async () => {
      await IncomeExpensePage.tapCreateButton();
      await driver.pause(5000);
    });
    await stepSS('Проверить сумму расхода в блоке "Доходы и расходы"', async () => {
      await DashboardPage.verifyExpenseBlockHasAmount(expenseAmount);
    });
    await stepSS('Проверить сумму в блоке "Благосостояние" после расхода', async () => {
      await DashboardPage.verifyWealthBlockHasAmount(expectedWealthAmount);
    });
    await stepSS('Выход из системы', async () => {
      await LoginPage.tapBackButton();
      await browser.pause(3000);
      await LoginPage.scrollToEdge('up');
      await LoginPage.tapLogoutButton();
      await browser.pause(3000);
    });
  });

  it('Создание обязательства с типом "Периодичный"', async () => {
    const ownerData = TestDataManager.getTestData('owner');
    if (!ownerData || !('password' in ownerData)) {
      throw new Error('Данные владельца отсутствуют или некорректны');
    }

    const obligationType = 'Обязательство';
    const investmentType = 'Автокредит';
    const depositAccount = 'Основной';
    const creditAmount = 1512000;
    const paymentType = 'Периодичный';
    const paymentAmount = 42000;
    const frequency = 'Месяц';
    const startDate = 'текущая дата';

    addTestMeta({
      type: 'obligation',
      obligationType,
      investmentType,
      depositAccount,
      creditAmount,
      paymentType,
      paymentAmount,
      frequency,
      startDate,
      ownerData,
    });

    // Подготовка среды
    await prepareApp(driver, LoginPage, attachScreenshot);

    await stepSS('Ввести email и пароль и нажать "Войти"', async () => {
      await LoginPage.loginWithCredentials(ownerData.email, ownerData.password);
    });
    await stepSS('Нажать по Блоку Благосостояние', async () => {
      await DashboardPage.tapWealthSection();
    });
    await stepSS('Нажать кнопку плюс', async () => {
      await WealthPage.tapRectView();
    });
    await stepSS('Выбрать тип операции — "Обязательство"', async () => {
      await WealthPage.tapObligationType();
    });
    await stepSS('Выбрать тип инвестиции — "Автокредит"', async () => {
      await WealthPage.tapInvestmentType();
      await WealthPage.tapAutoLoanCategory();
    });
    await stepSS('Выбрать счёт зачисления средств', async () => {
      await WealthPage.tapInvestmentDepositAccount();
      await CommonCatalogPage.tapMainAccountItem();
    });
    await stepSS('Выбрать счёт списания средств', async () => {
      await WealthPage.tapDebitAccountButton();
      await CommonCatalogPage.tapMainAccountItem();
    });
    await stepSS('Ввести сумму кредита', async () => {
      await WealthPage.tapCreditAmountContainer(creditAmount);
    });
    await stepSS('Выбрать тип выплат', async () => {
      await WealthPage.tapPaymentType();
      await WealthPage.tapPeriodicPaymentType();
      await LoginPage.scrollToEdge('up', { debug: true });
    });
    await stepSS('Ввести сумму платежа', async () => {
      await WealthPage.tapPaymentAmountContainer(paymentAmount);
    });
    await stepSS('Выбрать периодичность', async () => {
      await WealthPage.tapFrequency();
      await WealthPage.tapMonthlyFrequency();
    });
    await stepSS('Указать дату и время начала', async () => {
      await WealthPage.tapStartDateAndTime();
      await DatePickerPage.selectCurrentDate();
      await DatePickerPage.tapPreviousMonthThreeTimes();
      await DatePickerPage.selectDayInCalendar();
      await DatePickerPage.clickOkButton();
      await IncomeExpensePage.tapDoneButton();
    });
    await stepSS('Указать дату и время завершения', async () => {
      await WealthPage.tapEndDateAndTime();
      await DatePickerPage.selectCurrentDate();
      await DatePickerPage.clickDatePickerYearHeader();
      await DatePickerPage.selectYearPlusThree();
      await DatePickerPage.clickOkButton();
      await IncomeExpensePage.tapDoneButton();
    });
    await stepSS('Подтвердить создание обязательства — нажать "Создать"', async () => {
      await IncomeExpensePage.tapCreateButton();
      await driver.pause(3000);
    });
    await stepSS('Проверить появление созданного обязательства', async () => {
      await LoginPage.scrollToEdge('up', { debug: true });
      await WealthPage.verifyAutoLoanObligation(creditAmount, paymentAmount);
    });
    await stepSS('Нажать Назад', async () => {
      await LoginPage.scrollToEdge('down', { debug: true });
      await DashboardPage.tapIncomeEntryButton();
    });
    await stepSS('Проверить расход в предыдущем месяце', async () => {
      await DashboardPage.tapPreviousMonthOnChart();
      await DashboardPage.verifyChartExpenseHasAmount(paymentAmount);
    });
    await stepSS('Проверить расход в позапрошлом месяце', async () => {
      await DashboardPage.tapPreviousMonthOnChart();
      await driver.pause(7000);
      await DashboardPage.verifyChartExpenseHasAmount(paymentAmount);
    });
    await stepSS('Выход из системы', async () => {
      await LoginPage.tapBackButton();
      await browser.pause(3000);
      await LoginPage.scrollToEdge('up');
      await LoginPage.tapLogoutButton();
      await browser.pause(3000);
    });
  });

  // it('Создание обязательства с типом "Разовый"', async () => {
  //   const ownerData = TestDataManager.getTestData('owner');
  //   if (!ownerData || !('password' in ownerData)) {
  //     throw new Error('Данные владельца отсутствуют или некорректны');
  //   }

  //   const obligationType = 'Обязательство';
  //   const investmentType = 'Займ';
  //   const description = 'Тестовое обязательство';
  //   const depositAccount = 'Основной';
  //   const paymentType = 'Разовый';

  //   // ИСКУССТВЕННОЕ ПАДЕНИЕ ДЛЯ ПРОВЕРКИ РЕКАВЕРИ
  //   // throw new Error('Force fail');

  //   addTestMeta({
  //     type: 'obligation',
  //     obligationType,
  //     investmentType,
  //     depositAccount,
  //     paymentType,
  //     ownerData,
  //   });

  //   // Подготовка среды
  //   await prepareApp(driver, LoginPage, attachScreenshot);

  //   await stepSS('Ввести email и пароль и нажать "Войти"', async () => {
  //     await LoginPage.loginWithCredentials(ownerData.email, ownerData.password);
  //   });
  //   await stepSS('Нажать по Блоку Благосостояние', async () => {
  //     await DashboardPage.tapWealthSection();
  //   });
  //   await stepSS('Нажать кнопку плюс', async () => {
  //     await WealthPage.tapRectView();
  //   });
  //   await stepSS('Выбрать тип операции — "Обязательство"', async () => {
  //     await WealthPage.tapObligationType();
  //   });
  //   await stepSS('Выбрать тип инвестиции — "Займ"', async () => {
  //     await WealthPage.tapInvestmentType();
  //     await WealthPage.tapLoanCategory();
  //   });
  //   await stepSS('Ввести Описание актива', async () => {
  //     await WealthPage.setObligationDescription(description);
  //   });
  //   await stepSS('Выбрать счёт зачисления средств', async () => {
  //     await WealthPage.scrollToEdge('up');
  //     await WealthPage.tapInvestmentDepositAccount();
  //     await CommonCatalogPage.tapMainAccountItem();
  //   });
  //   await stepSS('Подтвердить создание обязательства — нажать "Создать"', async () => {
  //     await IncomeExpensePage.tapCreateButton();
  //     await driver.pause(3000);
  //   });
  //   // TODO: добавить проверки после определения селекторов
  // });

  it('Создание личного актива (Квартира)', async () => {
    const ownerData = TestDataManager.getTestData('owner');
    if (!ownerData || !('password' in ownerData)) {
      throw new Error('Данные владельца отсутствуют или некорректны');
    }

    const assetName = 'Квартира';
    const assetDescription = 'Долгожданная';
    const assetPrice = 10000000;
    const assetInvestmentType = 'Квартира';
    const assetGroup = 'Недвижимость';
    const assetType = 'Личный актив';

    addTestMeta({
      type: 'asset',
      ownerData,
      assetName,
      assetDescription,
      assetPrice,
      assetInvestmentType,
      assetGroup,
      assetType,
    });

    // Подготовка среды
    await prepareApp(driver, LoginPage, attachScreenshot);

    await stepSS('Ввести email и пароль и нажать "Войти"', async () => {
      await LoginPage.loginWithCredentials(ownerData.email, ownerData.password);
    });
    await stepSS('Нажать по Блоку Благосостояние', async () => {
      await DashboardPage.tapWealthSection();
    });
    await stepSS('Нажать плюс (форма создания)', async () => {
      await WealthPage.tapRectView();
    });
    await stepSS('Выбрать тип операции — "Актив"', async () => {
      await WealthPage.tapAssetButton();
    });
    await stepSS('Выбрать тип инвестиции — "Квартира"', async () => {
      await WealthPage.tapInvestmentTypeApartment();
    });
    await stepSS('Выбрать группу инвестиции — "Недвижимость"', async () => {
      await WealthPage.tapInvestmentGroupRealEstate();
    });
    await stepSS('Выбрать тип актива — "Личный актив"', async () => {
      await WealthPage.tapAssetTypePersonal();
    });
    await stepSS('Выбрать способ приобретения — "Покупка"', async () => {
      await WealthPage.tapAcquisitionMethodPurchase();
    });
    await stepSS('Ввести Название актива', async () => {
      await WealthPage.setAssetName(assetName);
    });
    await stepSS('Ввести Описание актива', async () => {
      await WealthPage.setAssetDescription(assetDescription);
    });
    await stepSS('Открыть выбор "Счёт покупки"', async () => {
      await WealthPage.tapPurchaseAccount();
    });
    await stepSS('Выбрать основной счёт покупки', async () => {
      await WealthPage.chooseMainAccountForPurchase();
    });
    await stepSS('Ввести цену покупки', async () => {
      await LoginPage.scrollToEdge('up', { debug: true });
      await WealthPage.setPurchasePrice(assetPrice);
    });
    await stepSS('Выбрать дату покупки (три месяца назад)', async () => {
      await WealthPage.setPurchaseDateThreeMonthsAgo();
    });
    await stepSS('Нажать Создать', async () => {
      await WealthPage.tapCreateAssetButton();
      await driver.pause(5000);
      await LoginPage.scrollToEdge('up', { debug: true });
    });
    // TODO: шаг проверки появления актива после определения селектора
  });
});

// Глобальная пауза после каждого теста (для корректного завершения записи видео)
afterEach(async () => {
  await driver.pause(5000);
});
