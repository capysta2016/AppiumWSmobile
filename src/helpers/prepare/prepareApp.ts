import { runStep } from '../../utils/steps';
import {
  isOnboardingCompleted,
  markOnboardingCompleted,
  isEnvironmentPrepared,
  markEnvironmentPrepared,
} from '../../utils/appState';
import { wasPreviousTestFailed } from '../../utils/testRecovery';

export async function prepareApp(
  driver: any,
  LoginPage: any,
  attachScreenshot: (desc: string) => Promise<void>,
) {
  const initialPause = Number(process.env.PREPARE_APP_INITIAL_PAUSE_MS || 1000);
  await driver.pause(initialPause);
  if (process.env.INLINE_STEP_SCREENSHOTS === 'false') {
    await attachScreenshot('Приложение запустилось');
  } else {
    await runStep('Инициализация приложения', async () => {});
  }

  // ПЕРВЫМ ДЕЛОМ проверяем кнопку "Начать" (онбординг)
  // Это должно происходить ДО настройки окружения
  const onboardingCompleted = isOnboardingCompleted();
  const previousFailed = wasPreviousTestFailed();
  const shouldHandleOnboarding = !onboardingCompleted || previousFailed;

  console.log(
    `[prepareApp] Состояние онбординга: завершен=${onboardingCompleted}, предыдущий_тест_упал=${previousFailed}, обрабатывать=${shouldHandleOnboarding}`,
  );

  if (shouldHandleOnboarding) {
    // Увеличиваем таймаут для поиска кнопки "Начать" и добавляем дополнительное ожидание
    console.log('[prepareApp] Ждем полной инициализации приложения после очистки данных...');

    // Ждем стабилизации activity приложения
    await browser.waitUntil(
      async () => {
        const currentActivity = await driver.getCurrentActivity();
        const currentPackage = await driver.getCurrentPackage();
        console.log(
          `[prepareApp] Текущая activity: ${currentActivity}, package: ${currentPackage}`,
        );
        return currentActivity === '.MainActivity' && currentPackage === 'com.fin.whiteswan';
      },
      {
        timeout: 15000,
        interval: 1000,
        timeoutMsg: 'Приложение не достигло стабильного состояния',
      },
    );

    await driver.pause(3000); // Увеличенная пауза для полной загрузки после clear-data

    console.log('[prepareApp] Ищем кнопку "Начать" с увеличенным таймаутом...'); // Используем специальный метод поиска кнопки "Начать"
    const startButtonFound = await LoginPage.findStartButton(15000); // Увеличиваем таймаут поиска

    if (startButtonFound) {
      console.log('[prepareApp] Кнопка "Начать" найдена, нажимаем...');
      await runStep('Пропустить онбординг - нажать "Начать"', async () => {
        await LoginPage.tapStartButton();
        // Даем время на анимацию перехода
        await browser.pause(3000);
      });
      // Отмечаем, что онбординг завершен
      markOnboardingCompleted();
      console.log('[prepareApp] Онбординг успешно завершен');
    } else {
      console.log('[prepareApp] Кнопка "Начать" не найдена ни с одним из селекторов');
    }
  } else {
    console.log('[prepareApp] Онбординг уже был пройден, пропускаем кнопку "Начать"');
  }

  // Ожидаем появления actionButton (svg) более адаптивно
  let actionButtonFound = false;
  if (process.env.WAIT_ACTION_BUTTON !== 'false') {
    const maxWait = Number(process.env.ACTION_BUTTON_WAIT_TIMEOUT_MS || 8000);
    const start = Date.now();
    while (Date.now() - start < maxWait) {
      try {
        if (await LoginPage.actionButton.isDisplayed()) {
          actionButtonFound = true;
          break;
        }
      } catch {}
      await driver.pause(400);
    }
    if (!actionButtonFound) {
      console.warn(
        '[prepareApp] actionButton не появился за allotted timeout — пропускаю выбор окружения, но продолжаю работу',
      );
    }
  } else {
    // Если отключена проверка actionButton, считаем что он есть
    actionButtonFound = true;
  }

  // Выбор окружения (только если actionButton найден И если окружение еще не настроено)
  const environmentPrepared = isEnvironmentPrepared();
  const shouldSetupEnvironment = actionButtonFound && (!environmentPrepared || previousFailed);

  console.log(
    `[prepareApp] Выбор окружения: actionButton=${actionButtonFound}, окружение_готово=${environmentPrepared}, предыдущий_упал=${previousFailed}, настраивать=${shouldSetupEnvironment}`,
  );

  if (shouldSetupEnvironment) {
    await runStep('Открыть настройки', async () => {
      await LoginPage.tapActionButton();
    });
    await runStep('Нажать на Продакшн сервер', async () => {
      await LoginPage.tapProductionServerEnvironment();
      await LoginPage.testServer.waitForDisplayed({ timeout: 15000 });
    });
    await runStep('Выбрать тестовый сервер', async () => {
      await LoginPage.tapTestServer();
      await LoginPage.complexButton.waitForDisplayed({ timeout: 15000 });
    });
    await runStep('Нажать кнопку Назад', async () => {
      await LoginPage.tapComplexButton();
      await LoginPage.registrationButton.waitForDisplayed({ timeout: 15000 });
    });

    // Отмечаем что настройка окружения завершена
    markEnvironmentPrepared();
    console.log('[prepareApp] Настройка окружения завершена');
  } else if (!actionButtonFound) {
    console.warn('[prepareApp] Пропускаю настройку окружения — actionButton не найден');
  } else {
    console.log('[prepareApp] Пропускаю настройку окружения — она уже была выполнена ранее');
  }
}
