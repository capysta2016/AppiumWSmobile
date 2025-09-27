/*
 * Очистка папок allure-results и '-p' перед запуском тестов.
 * TypeScript версия. Перенесено из scripts/ в src/utils.
 */
import fs from 'fs';
import path from 'path';
import { rimraf } from 'rimraf';

// Путь к корню репозитория (поднимаемся на два уровня от src/utils)
const ROOT = path.resolve(__dirname, '..', '..');
const ALLURE_RESULTS = path.join(ROOT, 'allure-results');
const MINUS_P_DIR = path.join(ROOT, '-p');

function removeIfExists(dirPath: string, label: string) {
  if (fs.existsSync(dirPath)) {
    rimraf.sync(dirPath);
    console.log(`🗑️  Удалена папка: ${label}`);
  }
}

function ensureDir(dirPath: string, label: string) {
  fs.mkdirSync(dirPath, { recursive: true });
  console.log(`✅ Создана папка: ${label}`);
}

export function cleanAllure() {
  removeIfExists(ALLURE_RESULTS, 'allure-results');
  removeIfExists(MINUS_P_DIR, '-p');
  ensureDir(ALLURE_RESULTS, 'allure-results');

  if (process.env.CI) {
    console.log('ℹ️  Режим CI: только Node.js, без mkdir -p (поведение эквивалентно)');
  }
}

if (require.main === module) {
  try {
    cleanAllure();
  } catch (err) {
    console.error('❌ Ошибка очистки Allure директорий', err);
    process.exit(1);
  }
}
