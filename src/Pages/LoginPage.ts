// src/Pages/LoginPage.ts
import BasePage from './BasePage';
import { $ } from '@wdio/globals';
// Перевод на новый унифицированный scroll helper

const selectors = {
  // Выбор среды выполнения
  actionButton:
    '-android uiautomator: new UiSelector().className("com.horcrux.svg.SvgView").instance(0)',
  productionServerEnvironment: '//android.view.ViewGroup[@content-desc="Окружение"]',
  testServer: '~Тестовый сервер',
  complexButton:
    '(//android.widget.ScrollView)[2]//android.view.ViewGroup/android.view.ViewGroup/android.view.ViewGroup[2]',
  // Регистрация, Авторизация, Восстановление пароля, Онбординг
  registrationButton: '~Регистрация',
  emailInput: '~Введите Email',
  passwordInput: '~Пароль',
  confirmPasswordInput: '~Подтвердите пароль',
  submitRegistrationButton: '~Зарегистрироваться',
  confirmationCodeInput: '~Введите код',
  confirmButton: '~Подтвердить',
  emailInputField:
    '//android.view.ViewGroup[@content-desc="Введите Email"]/android.widget.EditText',
  passwordInputLogin: '//android.view.ViewGroup[@content-desc="Пароль"]/android.widget.EditText',
  loginButton: '//android.view.ViewGroup[@content-desc="Войти"]',
  forgotPasswordLink: '-android uiautomator: new UiSelector().text("Забыли пароль?")',
  emailInputFieldForgot:
    '//android.view.ViewGroup[@content-desc="Введите Email"]/android.widget.EditText',
  sendCodeButton: '~Отправить код',
  verificationCodeInput:
    '//android.view.ViewGroup[@content-desc="Введите код"]/android.widget.EditText',
  newPasswordInput:
    '//android.view.ViewGroup[@content-desc="Новый пароль"]/android.widget.EditText',
  confirmNewPasswordInput:
    '//android.view.ViewGroup[@content-desc="Подтвердите новый пароль"]/android.widget.EditText',
  saveButtonNext: '~Сохранить',
  backButtonIcon: 'android=new UiSelector().className("android.view.ViewGroup").instance(13)',
  logoutButton: '~Выйти',
  startButton: '//android.view.ViewGroup[@content-desc="Начать"]',
};

class LoginPage extends BasePage {
  // Автоматические геттеры для всех селекторов
  [key: string]: any;

  // --- Универсальные действия ---
  // Выбор среды выполнения
  async tapActionButton() {
    await this.click(this.actionButton);
  }
  async tapProductionServerEnvironment() {
    await this.click(this.productionServerEnvironment);
  }
  async tapTestServer() {
    await this.click(this.testServer);
  }
  async tapComplexButton() {
    await this.click(this.complexButton);
  }
  // Действия Рег, Авт, Восст, Онбординг
  async tapRegistrationButton() {
    await this.click(this.registrationButton);
  }
  async tapSubmitRegistrationButton() {
    await this.click(this.submitRegistrationButton);
  }
  async tapConfirmButton() {
    await this.click(this.confirmButton);
  }
  async tapBackButton() {
    await this.click(this.backButtonIcon);
  }
  async tapLogoutButton() {
    await this.click(this.logoutButton);
  }
  async tapStartButton() {
    // Пробуем разные селекторы для кнопки "Начать"
    const selectors = [
      '//android.view.ViewGroup[@content-desc="Начать"]',
      '~Начать',
      '-android uiautomator: new UiSelector().description("Начать")',
    ];

    let buttonElement = null;
    for (const selector of selectors) {
      try {
        const element = $(selector);
        await element.waitForDisplayed({ timeout: 3000 });
        if (await element.isDisplayed()) {
          buttonElement = element;
          console.log(`[LoginPage] Используем селектор для кнопки "Начать": ${selector}`);
          break;
        }
      } catch (error) {
        console.log(`[LoginPage] Селектор ${selector} не сработал: ${error}`);
      }
    }

    if (buttonElement) {
      // Выполняем свайпы онбординга для активации кнопки, проверяя после каждого свайпа
      console.log('[LoginPage] Выполняем свайпы онбординга для активации кнопки...');
      await this.performOnboardingSwipesUntilEnabled(buttonElement);

      // Ждем пока кнопка станет кликабельной с увеличенным таймаутом
      console.log('[LoginPage] Ожидаем активации кнопки "Начать"...');

      try {
        await browser.waitUntil(
          async () => {
            const isEnabled = await buttonElement.isEnabled();
            if (!isEnabled) {
              console.log('[LoginPage] Кнопка еще не активна, ждем...');
            }
            return isEnabled;
          },
          {
            timeout: 10000, // Уменьшаем до 10 секунд, так как свайпы уже выполнены
            interval: 500, // Уменьшаем интервал
            timeoutMsg: 'Кнопка "Начать" не стала активной за 10 секунд после свайпов',
          },
        );

        console.log('[LoginPage] Кнопка активна, нажимаем...');
        await buttonElement.click();
        console.log('[LoginPage] Кнопка "Начать" нажата успешно');
      } catch (timeoutError) {
        console.log(
          '[LoginPage] Таймаут ожидания активации кнопки. Пробуем нажать через координаты...',
        );

        // Альтернативный способ - нажатие через координаты
        const location = await buttonElement.getLocation();
        const size = await buttonElement.getSize();
        const x = location.x + size.width / 2;
        const y = location.y + size.height / 2;

        console.log(`[LoginPage] Нажимаем по координатам: x=${x}, y=${y}`);
        await browser.touchAction([{ action: 'tap', x: x, y: y }]);
        console.log('[LoginPage] Кнопка "Начать" нажата через координаты');
      }
    } else {
      throw new Error('Кнопка "Начать" не найдена ни с одним из селекторов');
    }
  }
  async tapForgotPasswordLink() {
    await this.click(this.forgotPasswordLink);
  }
  async tapSendCodeButton() {
    await this.click(this.sendCodeButton);
  }
  async tapSaveButton() {
    await this.click(this.saveButtonNext);
  }

  /**
   * Выполняет свайпы онбординга для активации кнопки "Начать"
   * Делает свайпы справа налево, проверяя после каждого, активна ли кнопка
   */
  private async performOnboardingSwipesUntilEnabled(buttonElement: any) {
    try {
      const { width, height } = await browser.getWindowSize();

      // Координаты для свайпа справа налево (переход к следующему экрану)
      const startX = Math.round(width * 0.8); // Начало свайпа - правая сторона
      const endX = Math.round(width * 0.2); // Конец свайпа - левая сторона
      const centerY = Math.round(height * 0.5); // Вертикальный центр экрана

      console.log(`[LoginPage] Размеры экрана: ${width}x${height}`);
      console.log(
        `[LoginPage] Координаты свайпа: (${startX}, ${centerY}) -> (${endX}, ${centerY})`,
      );

      // Максимум 5 свайпов, но выходим раньше, если кнопка активна
      const maxSwipes = 5;
      for (let i = 1; i <= maxSwipes; i++) {
        // Проверяем, активна ли кнопка перед свайпом
        const isEnabled = await buttonElement.isEnabled();
        if (isEnabled) {
          console.log(`[LoginPage] Кнопка активна после ${i - 1} свайпов, прекращаем`);
          break;
        }

        console.log(`[LoginPage] Выполняем свайп ${i}/${maxSwipes}...`);

        await browser.performActions([
          {
            type: 'pointer',
            id: 'finger1',
            parameters: { pointerType: 'touch' },
            actions: [
              { type: 'pointerMove', duration: 0, x: startX, y: centerY },
              { type: 'pointerDown', button: 0 },
              { type: 'pause', duration: 100 },
              { type: 'pointerMove', duration: 500, x: endX, y: centerY },
              { type: 'pointerUp', button: 0 },
            ],
          },
        ]);

        await browser.releaseActions();
        await browser.pause(800); // Пауза между свайпами для стабильности

        console.log(`[LoginPage] Свайп ${i} завершен`);
      }

      console.log('[LoginPage] Свайпы онбординга выполнены');
    } catch (error) {
      console.warn('[LoginPage] Ошибка при выполнении свайпов онбординга:', error);
      // Не выбрасываем ошибку, чтобы не прерывать основной поток
    }
  }

  // --- Ввод данных ---
  async setEmail(email: string) {
    await this.setValue(this.emailInput, email);
  }
  async setPassword(password: string) {
    await this.setValue(this.passwordInput, password);
  }
  async setConfirmPassword(password: string) {
    await this.setValue(this.confirmPasswordInput, password);
  }
  async setConfirmationCode(code: string) {
    await this.setValue(this.confirmationCodeInput, code);
  }
  async setEmailForgot(email: string) {
    await this.setValue(this.emailInputFieldForgot, email);
  }
  async setVerificationCode(code: string) {
    await this.setValue(this.verificationCodeInput, code);
  }
  async setNewPassword(password: string) {
    await this.setValue(this.newPasswordInput, password);
  }
  async setConfirmNewPassword(password: string) {
    await this.setValue(this.confirmNewPasswordInput, password);
  }

  // --- Авторизация ---
  async loginWithCredentials(email: string, password: string) {
    await this.setValue(this.emailInputField, email);
    await this.setValue(this.passwordInputLogin, password);
    await this.click(this.loginButton);
    await browser.pause(5000);
  }
  // Специальный метод для поиска кнопки "Начать" с несколькими селекторами
  async findStartButton(timeout = 5000) {
    const selectors = [
      '//android.view.ViewGroup[@content-desc="Начать"]',
      '~Начать',
      '-android uiautomator: new UiSelector().description("Начать")',
    ];

    for (const selector of selectors) {
      try {
        const visible = await this.isElementDisplayed(selector, timeout / selectors.length);
        if (visible) {
          console.log(`[LoginPage] Кнопка "Начать" найдена с селектором: ${selector}`);
          return true;
        }
      } catch (error) {
        console.log(`[LoginPage] Селектор ${selector} не сработал при поиске`);
      }
    }
    return false;
  }
  // Высокоуровневый метод: доскроллить до кнопки выхода и нажать.
  public async scrollAndTapLogout(direction: 'up' | 'down' = 'up') {
    console.log('[LoginPage] Начинаем поиск кнопки Выйти');

    const logoutFound = await this.scrollAndClick('~Выйти', direction, true);

    if (logoutFound) {
      // Ждём появления элементов входа (признак успешного выхода)
      try {
        await browser.waitUntil(
          async () => {
            try {
              const regBtn = await $('~Регистрация');
              const loginBtn = await $('//android.view.ViewGroup[@content-desc="Войти"]');
              return (await regBtn.isDisplayed()) || (await loginBtn.isDisplayed());
            } catch {
              return false;
            }
          },
          {
            timeout: 8000,
            interval: 400,
            timeoutMsg: 'Не удалось подтвердить выход из системы',
          },
        );
        console.log('[LoginPage] Выход из системы подтверждён');
      } catch (error) {
        console.log(
          '[LoginPage] Предупреждение: не удалось подтвердить выход:',
          (error as Error).message,
        );
      }
    } else {
      throw new Error('[LoginPage] Не удалось найти кнопку Выйти');
    }
  }
}

for (const [name, selector] of Object.entries(selectors)) {
  Object.defineProperty(LoginPage.prototype, name, {
    get() {
      // Особые случаи для вложенных EditText
      if (
        ['emailInput', 'passwordInput', 'confirmPasswordInput', 'confirmationCodeInput'].includes(
          name,
        )
      ) {
        return $(selector).$('android.widget.EditText');
      }
      return $(selector);
    },
  });
}

export default new LoginPage();
