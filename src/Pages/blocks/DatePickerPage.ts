import BasePage from '../BasePage';
import { $ } from '@wdio/globals';

// Базовые статичные локаторы элементов системного (или кастомного) date picker'а
const selectors: Record<string, string> = {
  okButton: '//android.widget.Button[@resource-id="android:id/button1"]', // Кнопка подтверждения (ОК)
  datePickerYearHeader:
    '//android.widget.TextView[@resource-id="android:id/date_picker_header_year"]', // Заголовок с годом (тап по нему открывает выбор года)
  previousMonthButton: '~Previous month', // Кнопка переключения на предыдущий месяц
};

class DatePickerPage extends BasePage {
  [key: string]: any;

  // --- ХЕЛПЕРЫ ДЛЯ ДИНАМИЧЕСКИХ ЭЛЕМЕНТОВ ---
  // Кнопка даты по полной строке формата dd.MM.yyyy (используется когда date picker показывает готовые "чипсы" дат)
  getDynamicDateButton(dateString: string) {
    return $(`~${dateString}`);
  }
  // Конкретный день месяца в текущем видимом календаре
  calendarDayButton(day: string) {
    return $(
      `//android.view.View[@resource-id="android:id/month_view"]//android.view.View[@text="${day}" and @clickable="true"]`,
    );
  }
  // Возвращает номер "следующего" дня (today+1) либо 1, если сегодня последний день месяца — используется как вариативный выбор
  getNextDayNumber(): string {
    const today = new Date().getDate();
    const lastDay = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    return String(today === lastDay ? 1 : today + 1);
  }
  // Целевой год (текущий + 3) — для выбора будущей даты
  getTargetYear(): number {
    return new Date().getFullYear() + 3;
  }
  // Опция года в списке при переходе к выбору года
  yearOption(year: number) {
    return $(`//android.widget.TextView[@resource-id="android:id/text1" and @text="${year}"]`);
  }

  // --- ОСНОВНЫЕ ДЕЙСТВИЯ ---
  // Выбирает текущую дату (формирует строку dd.MM.yyyy и нажимает по соответствующей "чипсе")
  async selectCurrentDate() {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const formattedDate = `${day}.${month}.${year}`;
    await this.click(this.getDynamicDateButton(formattedDate));
  }
  // Листает календарь на три предыдущих месяца (используется для выбора даты "3 месяца назад")
  async tapPreviousMonthThreeTimes() {
    for (let i = 0; i < 3; i++) {
      await this.click(this.previousMonthButton);
      await browser.pause(1000); // даём анимации завершиться
    }
  }
  // Выбирает день в календаре: следующий после текущего (или 1 если today — последний день месяца)
  async selectDayInCalendar() {
    await this.click(this.calendarDayButton(this.getNextDayNumber()));
  }
  // Подтверждает выбор даты (OK)
  async clickOkButton() {
    await this.click(this.okButton);
  }
  // Открывает режим выбора года
  async clickDatePickerYearHeader() {
    await this.click(this.datePickerYearHeader);
  }
  // Выбирает год +3 от текущего (для задач с будущими датами)
  async selectYearPlusThree() {
    await this.click(this.yearOption(this.getTargetYear()));
  }
}

for (const [name, selector] of Object.entries(selectors)) {
  Object.defineProperty(DatePickerPage.prototype, name, {
    get() {
      return $(selector);
    },
  });
}

export default new DatePickerPage();
