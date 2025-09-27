# Примеры использования ScrollHelper

## Простые примеры использования:

### В тестах (прямое использование)

```typescript
import ScrollHelper from '../src/utils/scrollHelper';

// Скролл до самого верха
await ScrollHelper.scrollToTop();

// Скролл до самого низа
await ScrollHelper.scrollToBottom();

// Скролл и клик по элементу (самый удобный)
await ScrollHelper.scrollAndClick('~Создать', 'down', { debug: true });

// Точный скролл на N шагов
await ScrollHelper.scrollBySteps('down', 2);
```

### В Page Objects (через BasePage)

```typescript
// Используйте методы из BasePage:
await this.scrollAndClick('~Элемент', 'up');
await this.scrollToEdge('up');
await this.scrollBySteps('down', 3);
```
