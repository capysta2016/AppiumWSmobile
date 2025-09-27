import { faker } from '@faker-js/faker';
import fs from 'fs';

// Тип данных только для owner
export interface UserData {
  email: string;
  password: string;
}

// Хранилище теперь только с одним полем owner
type TestData = { owner: UserData | null };

// Для обратной совместимости оставляем псевдо-тип
type TestDataType = 'owner';

class TestDataManager {
  static STORAGE_FILE = 'src/json-data/test-data.json';
  static BACKUP_FILE = 'src/json-data/test-data-backup.json';

  static updateOwnerPassword(newPassword: string): void {
    const currentData = this.readData();
    if (!currentData || !currentData.owner) {
      throw new Error('Нет сохраненного owner для обновления пароля');
    }
    currentData.owner.password = newPassword;
    this.writeData(currentData);
  }

  // === Генерация тестовых данных ===
  static generateOwnerData(): UserData {
    return {
      email: faker.internet.email(),
      password: `Secure${faker.string.alphanumeric({ length: 12 })}!`,
    };
  }

  // Убраны генераторы для других сущностей

  // === Приватные методы работы с файлом ===
  private static readData(): TestData | null {
    try {
      if (!fs.existsSync(this.STORAGE_FILE)) {
        return { owner: null };
      }
      const rawData = fs.readFileSync(this.STORAGE_FILE, 'utf-8');
      const parsed = JSON.parse(rawData) as Partial<TestData> & Record<string, any>;
      // Защита: если вдруг остались старые поля — игнорируем.
      return { owner: parsed.owner ?? null };
    } catch (error) {
      console.error('Ошибка чтения файла. Возвращаем null.', error);
      return null;
    }
  }

  private static writeData(data: TestData): void {
    try {
      const dir = this.STORAGE_FILE.substring(0, this.STORAGE_FILE.lastIndexOf('/'));
      if (dir && !fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tempFile = `${this.STORAGE_FILE}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempFile, this.STORAGE_FILE);
    } catch (error) {
      console.error('Ошибка записи файла:', error);
      throw error;
    }
  }

  // === Публичные методы ===
  static getTestData(type: TestDataType): UserData | null {
    if (type !== 'owner') throw new Error('Поддерживается только тип owner');
    const data = this.readData();
    if (!data || !data.owner) return this.generateOwnerData();
    return JSON.parse(JSON.stringify(data.owner));
  }

  static saveData(type: TestDataType, value: UserData): void {
    if (type !== 'owner') throw new Error('Поддерживается только тип owner');
    const currentData = this.readData() || { owner: null };
    currentData.owner = JSON.parse(JSON.stringify(value));
    this.writeData(currentData);
  }

  static clearData(type: TestDataType): void {
    if (type !== 'owner') throw new Error('Поддерживается только тип owner');
    const currentData = this.readData();
    if (!currentData) return;
    const dir = this.STORAGE_FILE.substring(0, this.STORAGE_FILE.lastIndexOf('/'));
    if (dir && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(this.STORAGE_FILE)) fs.copyFileSync(this.STORAGE_FILE, this.BACKUP_FILE);
    currentData.owner = null;
    this.writeData(currentData);
  }
}

export default TestDataManager;
