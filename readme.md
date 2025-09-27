# Appium JS Tests

Набор мобильных автотестов (WebdriverIO + Appium + Allure).

## Запуск

Локально (эмулятор или реальное устройство):

```
npm run test:local
```

CI прогон (пример Jenkins):

```
APPIUM_PORT=4724 npm run test:ci
```

## Основные скрипты

| Скрипт                    | Описание                                                        |
| ------------------------- | --------------------------------------------------------------- |
| `npm run test`            | Запуск WDIO (использует `wdio.conf.ts`)                         |
| `npm run test:local`      | Очистка результатов, запуск тестов, генерация и открытие Allure |
| `npm run test:ci`         | Очистка, запуск, генерация отчёта (без открытия браузера)       |
| `npm run allure:clean`    | Удалить `allure-results` и `allure-report`                      |
| `npm run allure:generate` | Сгенерировать отчёт                                             |
| `npm run allure:open`     | Открыть локально Allure отчёт                                   |

## Переменные окружения (ENV)

| Переменная                | Значение / Формат | Назначение                                                                                                                                              | По умолчанию                   |
| ------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `REAL_DEVICE`             | `true/false`      | (Override) Принудительно включить (`true`) или выключить (`false`) использование реального устройства. Если НЕ задана – включён автодетект (см. ниже).  | (автодетект)                   |
| `UDID`                    | Строка            | Явный UDID устройства (fallback)                                                                                                                        | -                              |
| `DEVICE_NAME`             | Строка            | Название устройства в отчёте/капах                                                                                                                      | emulator-5554 / real_device    |
| `PLATFORM_VERSION`        | Версия Android    | Явно задать версию (иначе adb getprop)                                                                                                                  | auto                           |
| `APK_PATH`                | Путь к .apk       | Переопределить авто-поиск apk                                                                                                                           | авто-поиск в ./apps            |
| `FULL_RESET`              | `true/false`      | Полный сброс приложения                                                                                                                                 | false (noReset)                |
| `APP_PACKAGE`             | app package       | Используется при real device launch                                                                                                                     | com.fin.whiteswan              |
| `APP_ACTIVITY`            | activity          | Стартовая Activity                                                                                                                                      | com.fin.whiteswan.MainActivity |
| `APP_WAIT_ACTIVITY`       | activity          | Ждем Activity на эмуляторе                                                                                                                              | MainActivity                   |
| `APPIUM_PORT`             | число             | Порт Appium сервера                                                                                                                                     | 4724                           |
| `APPIUM_HOST`             | host              | Хост Appium                                                                                                                                             | localhost / 0.0.0.0 (CI)       |
| `KEEP_APP`                | `true/false`      | Не удалять приложение в afterSession                                                                                                                    | false                          |
| `ENABLE_VIDEO_REPORTER`   | `true/false`      | Подключить `wdio-video-reporter`                                                                                                                        | false                          |
| `DISABLE_NATIVE_VIDEO`    | `true/false`      | Не использовать Appium screen recording                                                                                                                 | false                          |
| `ALWAYS_ATTACH_VIDEO`     | `true/false`      | Прикреплять видео даже для passed тестов                                                                                                                | false                          |
| `SCREENSHOT_ON_PASS`      | `true/false`      | Скриншот для успешных тестов                                                                                                                            | false                          |
| `LOGS_ON_PASS`            | `true/false`      | logcat tail для passed тестов                                                                                                                           | false                          |
| `CLEAR_LOGCAT`            | `true/false`      | Очищать logcat перед тестом                                                                                                                             | true                           |
| `VERBOSE_CMDS`            | `true/false`      | Показывать низкоуровневые шаги WebDriver (findElement, click, isDisplayed, авто-скриншоты). При false отображаются только ваши бизнес-шаги (step(...)). | false                          |
| `MEMINFO_LINES`           | число             | Сколько строк meminfo прикреплять (парсится ключевые секции + fallback)                                                                                 | 120                            |
| `INLINE_STEP_SCREENSHOTS` | `true/false`      | Встраивать скриншот внутрь каждого бизнес‑шага (через helper `stepSS`). При `false` делаются отдельные вложения через attachScreenshot.                 | true                           |
| `STEP_NUMBERING`          | `true/false`      | Включить авто-нумерацию шагов (1., 2., 3.) в `stepSS`. По умолчанию выключено.                                                                          | false                          |
| `ENHANCED_DEBUG`          | `true/false`      | Включить расширенную отладочную информацию для упавших тестов (UI Hierarchy, фильтрованные логи, системная информация)                                  | true                           |
| `RECOVER_PREV_FAIL`       | `true/false`      | Включает механизм перезапуска приложения если предыдущий тест упал                                                                                      | true                           |
| `RECOVER_WAIT_MS`         | число             | Доп. пауза после перезапуска приложения (ms)                                                                                                            | 0                              |
| `RECOVER_STRATEGY`        | enum              | Стратегия восстановления после упавшего предыдущего теста: `restart` / `clear-data` / `reinstall`                                                       | clear-data                     |
| `RECOVER_FORCE_REINSTALL` | `true/false`      | Игнорировать стратегию и всегда делать полную переустановку после падения предыдущего теста                                                             | false                          |
| `TEST_DB_VERSION`         | строка            | Добавляется в environment.properties                                                                                                                    | N/A                            |
| `TEST_USER`               | строка            | Добавляется в environment.properties                                                                                                                    | N/A                            |
| `CI`                      | (любое)           | Включает режим CI (hostname 0.0.0.0, retries=1)                                                                                                         | -                              |
| `JENKINS_URL`             | URL               | Интерпретируется как CI                                                                                                                                 | -                              |
| `FORCED_UNICODE_IME`      | `true/false`      | Принудительно включить unicodeKeyboard (IME) даже на реальном устройстве (может падать с SecurityException на некоторых прошивках)                      | false                          |

## Артефакты Allure

При падении теста автоматически прикрепляются:

- Скриншот
- Видео (native screen recording или последний файл video reporter)
- logcat (tail 500)
- dumpsys meminfo (первые строки)
- Failure meta (краткое сообщение)
- Raw afterTest payload (диагностика)
- **🔍 Полная отладочная информация** (системная информация, контекст приложения, метрики производительности)
- **📱 UI Hierarchy (XML)** (полная структура экрана на момент ошибки)
- **📋 Логи приложения (фильтрованные)** (только релевантные логи приложения)

> Расширенная отладочная информация управляется через `ENHANCED_DEBUG=true/false` (по умолчанию включена). Подробнее см. [DEBUG_INFO.md](./DEBUG_INFO.md).

Опционально (ENV):

- Видео для passed тестов (`ALWAYS_ATTACH_VIDEO=true`)
- Скриншот для passed (`SCREENSHOT_ON_PASS=true`)
- logcat tail (200) для passed (`LOGS_ON_PASS=true`)
- Inline скриншоты в шагах (`INLINE_STEP_SCREENSHOTS=true` — включено по умолчанию)

## Логика поиска APK

Берётся наиболее новый файл в директории `./apps`, имя которого соответствует шаблону `(build-|app-|release|debug).*\.apk`. Если не найдено — fallback `my-app.apk`.

## Видео

Два механизма (взаимодополняющие):

1. Native Appium (`startRecordingScreen` / `stopRecordingScreen`).
2. `wdio-video-reporter` (включается через `ENABLE_VIDEO_REPORTER=true`).

Рекомендуется оставить только один в долгосрочной перспективе.

## Жизненный цикл приложения и удаление

Последовательность действий по lifecycle теперь такая:

1. В начале каждого теста (beforeTest) при необходимости выполняется recovery (если предыдущий тест падал) — перезапуск/активация.
2. После каждого теста (afterTest) собираются артефакты и фиксируется статус (успех/провал).
3. После закрытия сессии WebDriver (afterSession):

- Если `KEEP_APP=true` — удаление приложения пропускается (для ускоренных локальных итераций).
- Иначе выполняется штатное завершение + удаление через `removeApp`.

4. После завершения всего раннера (onComplete) всегда выполняется принудительное `adb uninstall <package>` — даже если был `KEEP_APP=true` или что-то пошло не так в `afterSession`.

Таким образом, новый запуск тестов всегда стартует "с нуля" (чистая установка), независимо от того, чем закончился прошлый прогон.

Отключить финальное удаление нельзя (преднамеренно), но можно задать другой пакет через `APP_PACKAGE`.

## Бизнес‑шаги и скриншоты

Для лаконичных Allure отчётов используется собственный helper `stepSS` (поверх низкоуровневого `runStep`). Он даёт:

- Авто-нумерацию шагов внутри каждого `it` (1., 2., 3. ...).
- Короткие человеко‑читаемые названия без ручного добавления префиксов.
- Inline скриншот (если `INLINE_STEP_SCREENSHOTS !== 'false'`).
- Fallback явный скриншот через `attachScreenshot` если inline выключен.

### Быстрый пример

```ts
import { stepSS } from '../utils/stepHelper';

it('Login flow', async () => {
  await stepSS('Открыть логин', async () => {
    await LoginPage.open();
  });
  await stepSS('Ввести учётные данные', async () => {
    await LoginPage.login(user, pass);
  });
  await stepSS('Проверить дашборд', async () => {
    await DashboardPage.assertVisible();
  });
});
```

### Опции `stepSS`

```ts
await stepSS(
  'Название',
  async () => {
    /* действия */
  },
  {
    forceScreenshot: false, // Принудительно прикрепить скриншот дополнительно к inline (или когда inline отключён)
    noNumber: false, // Не добавлять авто-префикс "1. " только для этого шага
    customLabel: undefined, // Полностью переопределить итоговый текст шага (отключает авто-нумерацию если задан)
  },
);
```

Поведение:

- Если `INLINE_STEP_SCREENSHOTS=true` (по умолчанию) — внутри Allure шага появляется встроенный скриншот.
- Если выключить (`INLINE_STEP_SCREENSHOTS=false`) — используется классическая модель: шаг без изображения + отдельное вложение скриншота.
- `forceScreenshot: true` позволяет добавить отдельный артефакт даже при inline режиме (например, для сравнения до/после).

### Сброс счётчика

Счётчик шагов сбрасывается автоматически через `beforeEach(resetStepCounter())`. Если нужен ручной контроль — импортируйте `resetStepCounter`.

### Низкоуровневый helper `runStep`

`runStep(label, fn)` — базовая обёртка над Allure `startStep / endStep`, использующаяся внутри `stepSS`. Можно вызывать напрямую для особых сценариев без авто-нумерации.

## Переменные ENV, влияющие на репорт

| Флаг                           | Воздействие                                                                 |
| ------------------------------ | --------------------------------------------------------------------------- |
| `VERBOSE_CMDS=false`           | Скрывает технические шаги WebDriverIO, остаются только бизнес‑шаги `stepSS` |
| `INLINE_STEP_SCREENSHOTS=true` | Встраивает скриншот в сам шаг (минимум шума)                                |
| `SCREENSHOT_ON_PASS=true`      | Дополнительный финальный скриншот при успехе теста (после всех шагов)       |
| `ALWAYS_ATTACH_VIDEO=true`     | Видео всегда, даже если тест passed                                         |

Комбинируя флаги можно балансировать между детализацией и лаконичностью отчёта.

## Советы по диагностике

1. Если нет вложений при падении — проверь, что действительно срабатывает `afterTest` (в логе есть `[afterTest] test="..."`).
2. Убедись, что нет глобального try/catch, скрывающего ошибку внутри шага.
3. Для реального устройства добавь задержку между тестами, если видео пустое.
4. При большом logcat можно увеличить `-t 500` или подключить фильтрацию по тегам.
5. Если в отчёте видно слишком много технических шагов (`findElement`, `isElementDisplayed`, `takeScreenshot` и т.п.) — выключи их через `VERBOSE_CMDS=false` (по умолчанию уже скрыты). Включай `VERBOSE_CMDS=true` только для диагностики.

## TODO / Возможные улучшения

- Вынести логику записи видео в отдельный helper.
- Добавить сбор performance metrics через `adb shell top -b -n 1`.
- Добавить отправку отчёта в Telegram/Slack.
- Расширить стратегии восстановления: `auto` (эвристика: если второй подряд фейл → clear-data, если снова → reinstall); `backstack` (несколько нажатий back вместо очистки данных).
  - `auto`: будет считать число последовательных падений. 1-й → restart, 2-й → clear-data, 3-й и далее → reinstall (сброс счётчика при успешном тесте).
  - `backstack`: мягкий вариант — N нажатий аппаратной кнопки Back (конфигурируемый лимит), если остаёмся не на стартовом экране → fallback к restart.

---

### Стратегии восстановления (RECOVER_STRATEGY)

Переменная `RECOVER_STRATEGY` определяет как мы «чистим» приложение при старте следующего теста, если предыдущий упал.

| Значение                 | Действия                                                                      | Плюсы                                | Минусы / Риски                                     |
| ------------------------ | ----------------------------------------------------------------------------- | ------------------------------------ | -------------------------------------------------- |
| `clear-data` (по умолч.) | pm clear <package> → activateApp                                              | Всегда чистое состояние              | Теряются локальные данные/кеш, чуть медленнее      |
| `restart`                | terminateApp → pause → activateApp (fallback launchApp, fallback install apk) | Быстро                               | Может вернуть на тот же экран / сохранённая сессия |
| `reinstall`              | removeApp → installApp (apk) → activateApp                                    | Полная переустановка + чистые данные | Самое медленное; нужен apk и больше времени        |

Рекомендации:

1. По умолчанию уже включён `clear-data` — гарантированный чистый старт.
2. Если хотите ускорить прогон и приложение корректно само «откатывается» — задайте `RECOVER_STRATEGY=restart`.
3. Если видите артефакты/поломку после серии падений — временно используйте `reinstall`.

Дополнительно можно регулировать задержку после старта через `RECOVER_WAIT_MS` (например, `RECOVER_WAIT_MS=2000`).

Пример запуска c очисткой данных:

```
RECOVER_STRATEGY=clear-data npm run test:ci
```

Чтобы явно запустить главную Activity после очистки (если `activateApp` возвращает не тот экран), можно указать переменную `RECOVER_MAIN_ACTIVITY`:

```
RECOVER_MAIN_ACTIVITY=com.fin.whiteswan.MainActivity RECOVER_STRATEGY=clear-data npm run test:ci
```

Текущая последовательность для `clear-data` теперь:

1. `adb shell am force-stop <package>`
2. `adb shell pm clear <package>`
3. Если задана `RECOVER_MAIN_ACTIVITY` или `APP_ACTIVITY` — `adb shell am start -n <package>/<Activity>`
4. Иначе fallback `activateApp`
5. (Опционально) пауза `RECOVER_WAIT_MS`
6. Логируется текущая activity (если доступно)

Пример полной переустановки (нужно чтобы `APK_PATH` корректно указывал на apk):

```
RECOVER_STRATEGY=reinstall APK_PATH=./apps/build-latest.apk npm run test:ci
```

Если указано некорректное значение — лог предупредит и будет использован `clear-data`.

---

Обновляй ENV под свои нужды; если нужна интеграция с другим репортингом — можно расширить хуки.

## Автоматический выбор устройства

Логика автодетекта реального устройства теперь такая:

1. Если `REAL_DEVICE=true` или `FORCED_UNICODE_IME=true` — пробуем запустить на реальном устройстве (по UDID или первому доступному).
2. Иначе — эмулятор (по имени или первому доступному).

### IME / unicodeKeyboard поведение

По умолчанию `unicodeKeyboard` активен ТОЛЬКО на эмуляторах, т.к. на ряде реальных устройств включение `io.appium.settings/.UnicodeIME` приводит к ошибке `SecurityException: uid 2000 does not have android.permission.WRITE_SECURE_SETTINGS`.

Если вам обязательно нужен `unicodeKeyboard` на реальном девайсе (устройство рутовано или политика разрешает) — запустите с:

```
FORCED_UNICODE_IME=true REAL_DEVICE=true npm run test:local
```

При этом в capabilities будет выставлено `unicodeKeyboard=true` и `resetKeyboard=true`.
