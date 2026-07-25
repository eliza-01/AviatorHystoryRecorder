Aviator DOM history patch 1.2.0

Изменённые файлы:
- extension/manifest.json
- extension/src/content/content-script.js

Установка:
1. Скопировать файлы поверх проекта.
2. chrome://extensions -> Перезагрузить расширение.
3. Полностью закрыть вкладку игры и открыть заново.
4. Подождать 1-2 секунды после появления истории раундов.

Сборщик читает только прямых детей:
.stats > .payouts-wrapper > .payouts-block > .payout

Дублирующий список внутри app-stats-dropdown игнорируется.
