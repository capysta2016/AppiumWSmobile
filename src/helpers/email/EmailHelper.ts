// test/helpers/EmailHelper.ts
import axios, { AxiosInstance } from 'axios';
import utf8 from 'utf8';
import quotedPrintable from 'quoted-printable';
import * as cheerio from 'cheerio';

// Типы для данных MailHog
interface MailHogMessageHeader {
  [key: string]: string[];
}

interface MailHogMessageContent {
  Headers: MailHogMessageHeader;
  Body: string;
}

interface MailHogMessage {
  Created: string;
  Content: MailHogMessageContent;
}

interface FilteredEmail {
  date: string;
  subject: string;
  body: string;
}

// Константы для повторяющихся значений
const MAILHOG_BASE_URL: string = 'http://mailhog.testing.whiteswan.finance';
const DEFAULT_HEADERS: Record<string, string> = {
  'Content-Type': 'text/html; charset=UTF-8',
};

// Тексты заголовков писем
const EMAIL_SUBJECTS = {
  LOGIN:
    '=?utf-8?Q?=D0=9F=D0=BE=D0=B4=D1=82=D0=B2=D0=B5=D1=80=D0=B4?= =?utf-8?Q?=D0=B8=D1=82=D1=8C_=D0=BF=D0=BE=D1=87=D1=82=D1=83?=',
  RECOVERY:
    '=?utf-8?Q?=D0=9A=D0=BE=D0=B4_=D0=B4=D0=BB=D1=8F_?= =?utf-8?Q?=D0=B2=D0=BE=D1=81=D1=81=D1=82=D0=B0=D0=BD=D0=BE?= =?utf-8?Q?=D0=B2=D0=BB=D0=B5=D0=BD=D0=B8=D1=8F_=D0=BF?= =?utf-8?Q?=D0=B0=D1=80=D0=BE=D0=BB=D1=8F?=',
} as const;

// Максимальное количество попыток для getWaitEmailCode
const MAX_RETRIES: number = 30;
// Задержка между попытками в миллисекундах
const RETRY_DELAY: number = 2000;

export default class EmailHelper {
  private static createApiClient(): AxiosInstance {
    return axios.create({
      baseURL: MAILHOG_BASE_URL,
      withCredentials: true,
      headers: DEFAULT_HEADERS,
    });
  }

  private static async fetchEmails(): Promise<MailHogMessage[]> {
    try {
      const api: AxiosInstance = this.createApiClient();
      const response = await api.get('/api/v1/messages');
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to fetch emails: ${error.message}`);
    }
  }

  private static processEmailBody(body: string): string {
    const decodedBody: string = utf8.decode(quotedPrintable.decode(body));
    const $ = cheerio.load(decodedBody);
    return $('#code').text().replace(/\s/g, '');
  }

  static async getEmailCode(email: string): Promise<string> {
    const emails: MailHogMessage[] = await this.fetchEmails();

    const filteredEmails: FilteredEmail[] = emails
      .filter((elem: MailHogMessage) =>
        elem.Content.Headers.Subject?.[0]?.includes(EMAIL_SUBJECTS.LOGIN),
      )
      .filter((elem: MailHogMessage) => elem.Content.Headers.To?.[0]?.includes(email))
      .map((elem: MailHogMessage) => ({
        date: elem.Created,
        subject: elem.Content.Headers.Subject?.[0] || '',
        body: elem.Content.Body,
      }));

    if (filteredEmails.length === 0) {
      throw new Error('No matching emails found');
    }

    return this.processEmailBody(filteredEmails[0].body);
  }

  static async getWaitEmailCode(
    email: string,
    operation: 'login' | 'recovery' = 'login',
  ): Promise<string> {
    const expectedSubject: string =
      operation === 'recovery' ? EMAIL_SUBJECTS.RECOVERY : EMAIL_SUBJECTS.LOGIN;

    for (let attempt: number = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const emails: MailHogMessage[] = await this.fetchEmails();

        const filteredEmails: FilteredEmail[] = emails
          .filter((elem: MailHogMessage) =>
            elem.Content.Headers.Subject?.[0]?.includes(expectedSubject),
          )
          .filter((elem: MailHogMessage) => elem.Content.Headers.To?.[0]?.includes(email))
          .map((elem: MailHogMessage) => ({
            date: elem.Created,
            subject: elem.Content.Headers.Subject?.[0] || '',
            body: elem.Content.Body,
          }));

        if (filteredEmails.length > 0) {
          return this.processEmailBody(filteredEmails[0].body);
        }
      } catch (error: any) {
        console.error(`Attempt ${attempt} failed:`, error.message);
      }

      // Ждем перед следующей попыткой
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      }
    }

    throw new Error(`No email found after ${MAX_RETRIES} attempts`);
  }
}
