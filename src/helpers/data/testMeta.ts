import {
  addEpic,
  addFeature,
  addStory,
  addSeverity,
  addArgument,
  addDescription,
} from '@wdio/allure-reporter';

interface MetaParams {
  type:
    | 'registration'
    | 'login'
    | 'recovery'
    | 'account'
    | 'income'
    | 'expense'
    | 'obligation'
    | 'asset';
  ownerData?: any;
  accountName?: string;
  accountAmount?: number;
  expectedWealthAmount?: number;
  bankName?: string;
  incomeAmount?: number;
  incomeCategory?: string;
  incomeAccount?: string;
  incomeComment?: string;
  expenseAmount?: number;
  expenseCategory?: string;
  expenseAccount?: string;
  expenseComment?: string;
  obligationType?: string;
  investmentType?: string;
  depositAccount?: string;
  creditAmount?: number;
  paymentType?: string;
  paymentAmount?: number;
  frequency?: string;
  startDate?: string;
  // --- asset creation ---
  assetName?: string;
  assetDescription?: string;
  assetPrice?: number;
  assetType?: string;
  assetGroup?: string;
  assetInvestmentType?: string;
}

export function addTestMeta(params: MetaParams) {
  // Универсально добавим Email / Пароль (если переданы) как Arguments и подготовим фрагмент для HTML.
  const ownerEmail = (params as any)?.ownerData?.email;
  const ownerPassword = (params as any)?.ownerData?.password;

  switch (params.type) {
    case 'registration': {
      addEpic('Пользователи');
      addFeature('Регистрация');
      addStory('Регистрация нового владельца');
      addSeverity('critical');
      // if (ownerEmail) addArgument('Email', ownerEmail);
      // if (ownerPassword) addArgument('Пароль', ownerPassword);
      addDescription(
        `
<div>
  <h3>Цель теста</h3>
  <p>Проверить возможность регистрации нового владельца и получение кода подтверждения.</p>
  <ul>
    <li>Email: <strong>${ownerEmail ?? ''}</strong></li>
    <li>Пароль: <strong>${ownerPassword ?? ''}</strong></li>
  </ul>
</div>
        `,
        'html',
      );
      break;
    }
    case 'login': {
      addEpic('Пользователи');
      addFeature('Авторизация');
      addStory('Вход владельца с корректными данными');
      addSeverity('critical');
      // if (ownerEmail) addArgument('Email', ownerEmail);
      // if (ownerPassword) addArgument('Пароль', ownerPassword);
      addDescription(
        `
<div>
  <h3>Цель теста</h3>
  <p>Проверить успешную авторизацию зарегистрированного владельца.</p>
  <ul>
    <li>Email: <strong>${ownerEmail ?? ''}</strong></li>
    <li>Пароль: <strong>${ownerPassword ?? ''}</strong></li>
  </ul>
</div>
        `,
        'html',
      );
      break;
    }
    case 'recovery': {
      addEpic('Пользователи');
      addFeature('Восстановление пароля');
      addStory('Сброс пароля владельца через код электронной почты');
      addSeverity('critical');
      // if (ownerEmail) addArgument('Email', ownerEmail);
      // if (ownerPassword) addArgument('Пароль (новый)', ownerPassword);
      addDescription(
        `
<div>
  <h3>Цель теста</h3>
  <p>Проверить процесс восстановления пароля через отправку и ввод кода подтверждения.</p>
  <ul>
    <li>Email: <strong>${ownerEmail ?? ''}</strong></li>
    <li>Новый пароль: <strong>${ownerPassword ?? ''}</strong></li>
  </ul>
</div>
        `,
        'html',
      );
      break;
    }
    case 'account': {
      const { accountName, accountAmount, bankName } = params;
      addEpic('Финансовые операции');
      addFeature('Счета');
      addStory('Создание банковского счета');
      addSeverity('normal');
      // if (ownerEmail) addArgument('Email', ownerEmail);
      // if (ownerPassword) addArgument('Пароль', ownerPassword);
      if (accountName) addArgument('Название счета', accountName);
      if (bankName) addArgument('Банк', bankName);
      if (typeof accountAmount === 'number') addArgument('Начальный баланс', String(accountAmount));
      addDescription(
        `
<div>
  <h3>Цель теста</h3>
  <p>Проверить создание банковского счета и корректное отображение его в интерфейсе.</p>
  <ul>
    <li>Email: <strong>${ownerEmail ?? ''}</strong></li>
    <li>Пароль: <strong>${ownerPassword ?? ''}</strong></li>
  </ul>
</div>
        `,
        'html',
      );
      break;
    }
    case 'income': {
      const {
        incomeAmount,
        incomeCategory,
        incomeAccount,
        incomeComment,
        accountAmount,
        expectedWealthAmount,
      } = params;
      addEpic('Финансовые операции');
      addFeature('Добавление дохода');
      addStory('Создание дохода и проверка баланса');
      addSeverity('critical');
      // if (ownerEmail) addArgument('Email', ownerEmail);
      // if (ownerPassword) addArgument('Пароль', ownerPassword);
      addArgument('Категория дохода', incomeCategory ?? '');
      addArgument('Счет', incomeAccount ?? '');
      addArgument('Сумма дохода:', incomeAmount !== undefined ? String(incomeAmount) : '');
      addArgument('Комментарий', incomeComment ?? '');
      addArgument('Начальный баланс', accountAmount !== undefined ? String(accountAmount) : '');
      addArgument(
        'Ожидаемый итоговый баланс',
        expectedWealthAmount !== undefined ? String(expectedWealthAmount) : '',
      );

      addDescription(
        `
<div>
  <h3>Цель теста</h3>
  <p>Проверить процесс добавления дохода и корректное отображение суммы:</p>
  <ul>
    <li>Email: <strong>${ownerEmail ?? ''}</strong></li>
    <li>Пароль: <strong>${ownerPassword ?? ''}</strong></li>
  </ul>
</div>
        `,
        'html',
      );
      break;
    }
    case 'expense': {
      const {
        expenseAmount,
        expenseCategory,
        expenseAccount,
        expenseComment,
        accountAmount,
        incomeAmount,
        expectedWealthAmount,
      } = params;
      addEpic('Финансовые операции');
      addFeature('Добавление расхода');
      addStory('Создание расхода и проверка баланса');
      addSeverity('critical');
      // if (ownerEmail) addArgument('Email', ownerEmail);
      // if (ownerPassword) addArgument('Пароль', ownerPassword);
      addArgument('Категория расхода', expenseCategory ?? '');
      addArgument('Счет', expenseAccount ?? '');
      addArgument('Комментарий', expenseComment ?? '');
      addArgument('Начальный баланс', accountAmount !== undefined ? String(accountAmount) : '');
      addArgument('Сумма дохода', incomeAmount !== undefined ? String(incomeAmount) : '');
      addArgument('Сумма расхода', expenseAmount !== undefined ? String(expenseAmount) : '');
      addArgument(
        'Ожидаемый итоговый баланс',
        expectedWealthAmount !== undefined ? String(expectedWealthAmount) : '',
      );
      addDescription(
        `
<div>
  <h3>Цель теста</h3>
  <p>Проверить процесс добавления расхода и корректное отображение суммы:</p>
  <ul>
    <li>Email: <strong>${ownerEmail ?? ''}</strong></li>
    <li>Пароль: <strong>${ownerPassword ?? ''}</strong></li>
  </ul>
</div>
        `,
        'html',
      );
      break;
    }
    case 'obligation': {
      const {
        obligationType,
        investmentType,
        depositAccount,
        creditAmount,
        paymentType,
        paymentAmount,
        frequency,
        startDate,
      } = params;
      addEpic('Финансовые операции');
      addFeature('Создание обязательства');
      addStory('Создание обязательства с типом "Периодичный"');
      addSeverity('critical');
      // if (ownerEmail) addArgument('Email', ownerEmail);
      // if (ownerPassword) addArgument('Пароль', ownerPassword);
      addArgument('Тип обязательства', obligationType ?? '');
      addArgument('Тип инвестиции', investmentType ?? '');
      addArgument('Счет', depositAccount ?? '');
      addArgument('Сумма кредита', creditAmount !== undefined ? String(creditAmount) : '');
      addArgument('Тип выплат', paymentType ?? '');
      addArgument('Сумма платежа', paymentAmount !== undefined ? String(paymentAmount) : '');
      addArgument('Периодичность', frequency ?? '');
      addArgument('Дата начала', startDate ?? '');
      addDescription(
        `
<div>
  <h3>Цель теста</h3>
  <p>Проверить процесс создания обязательства с типом "Периодичный":</p>
  <ul>
    <li>Email: <strong>${ownerEmail ?? ''}</strong></li>
    <li>Пароль: <strong>${ownerPassword ?? ''}</strong></li>
  </ul>
</div>
        `,
        'html',
      );
      break;
    }
    case 'asset': {
      const {
        assetName,
        assetDescription,
        assetPrice,
        assetType,
        assetGroup,
        assetInvestmentType,
      } = params;
      addEpic('Финансовые операции');
      addFeature('Создание актива');
      addStory('Создание инвестиционного актива (Недвижимость / Квартира)');
      addSeverity('normal');
      addArgument('Тип инвестиции', assetInvestmentType ?? '');
      addArgument('Группа', assetGroup ?? '');
      addArgument('Тип актива', assetType ?? '');
      addArgument('Название', assetName ?? '');
      addArgument('Описание', assetDescription ?? '');
      addArgument('Цена покупки', assetPrice !== undefined ? String(assetPrice) : '');
      addDescription(
        `
<div>
  <h3>Цель теста</h3>
  <p>Проверить создание инвестиционного актива типа "Квартира" в группе "Недвижимость".</p>
  <ul>
    <li>Email: <strong>${ownerEmail ?? ''}</strong></li>
    <li>Пароль: <strong>${ownerPassword ?? ''}</strong></li>
  </ul>
</div>
        `,
        'html',
      );
      break;
    }
    default:
      break;
  }
}
