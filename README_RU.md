<p align="center">
  <img src="plugin/assets/logo.png" width="96" height="96" alt="Context Attachment Manager">
</p>

<h1 align="center">Context Attachment Manager</h1>

<p align="center"><b>Длинные чаты с изображениями в Codex и Claude Code остаются быстрыми.</b><br>Изображения из прошлых сообщений заменяются короткими строками с ID. Когда модели снова нужна картинка, она получает оригинал по этому ID, даже после сжатия истории.</p>

<p align="center">
  <a href="https://github.com/chipfighter/context-attachment-manager/releases"><img src="https://img.shields.io/github/v/release/chipfighter/context-attachment-manager?include_prereleases" alt="GitHub Releases"></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="Windows, macOS, Linux">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT"></a>
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README_CN.md">简体中文</a> · <a href="README_TW.md">繁體中文</a> · <a href="README_JA.md">日本語</a> · <a href="README_KO.md">한국어</a> · <a href="README_VI.md">Tiếng Việt</a><br>
  <a href="README_ES.md">Español</a> · <a href="README_PT_BR.md">Português (Brasil)</a> · <a href="README_FR.md">Français</a> · <a href="README_DE.md">Deutsch</a> · <a href="README_IT.md">Italiano</a> · <a href="README_PL.md">Polski</a><br>
  <b>Русский</b> · <a href="README_TR.md">Türkçe</a> · <a href="README_AR.md">العربية</a> · <a href="README_HI.md">हिन्दी</a> · <a href="README_ID.md">Bahasa Indonesia</a> · <a href="README_TH.md">ไทย</a>
</p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/hero-dark.gif">
    <img src="docs/images/hero.gif" alt="До установки все старые изображения отправляются заново. После установки в запросе остаётся закреплённый референс, остальные изображения заменяются строками с ID. Модель запрашивает нужный оригинал по ID." width="100%">
  </picture>
</p>

<table>
  <tr>
    <td align="center" width="33%"><h3>42,4 МБ → 0,12 МБ</h3>Размер одного запроса в чате Codex с девятью ключевыми кадрами</td>
    <td align="center" width="33%"><h3>20/20 против 8/20</h3>Правильных ответов о картинках после сжатия истории (Sonnet 5.5)</td>
    <td align="center" width="33%"><h3>Примерно та же стоимость</h3>Самый большой запрос — 41 859 вместо 110 671 токена</td>
  </tr>
</table>

## Быстрый старт в три шага

**1. Установите плагин.** Отправьте агенту эту фразу. Он определит свою платформу и выполнит нужную установку.

```text
Установи мне Context Attachment Manager по инструкции https://github.com/chipfighter/context-attachment-manager/blob/main/INSTALL.md
```

Затем перезапустите агент. В Claude Desktop достаточно открыть новый сеанс Code. Для ручной установки используйте [инструкцию по установке, обновлению и удалению](INSTALL.md) на английском. В Codex и Claude Code новые версии устанавливаются в фоне и применяются при следующем запуске.

**2. Работайте как обычно.** Плагин включён по умолчанию. Старые картинки заменяются строками с ID. Новые изображения и закреплённые референсы отправляются целиком.

```text
[Image IMG-004 omitted | shot-1.png | generated image | turn 2 | 505×505]
Features: place: Street | Qinghe | medium shot, umbrella, lanterns
For the original, call cam_view_image with "IMG-004".
```

**3. Модель запрашивает оригинал по ID.** Если ей нужно снова рассмотреть старую картинку, она получает оригинал, в том числе после сжатия истории. Изображения и история остаются на вашем компьютере.

## Панель с персонажами и локациями

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/panel-dark.png">
    <img src="docs/images/panel.png" alt="Слева показаны карточки локаций. Справа открыт персонаж Цинхэ, сначала его референс, затем кадры на улице." width="100%">
  </picture>
</p>

- **Просматривайте картинки по категориям.** У персонажей, локаций, экранов и документов есть отдельные группы. На карточке персонажа сначала идут референсы, затем кадры с ним, сгруппированные по локациям.
- **Ищите по описанию или своей реплике.** Например, «дождливая ночь» или «лучшее лицо».
- **Закрепляйте референсы.** Откройте картинку и отметьте **Send every turn**.
- **Выбирайте картинки вручную.** Выключите **Auto-select** и отметьте изображения для следующего сообщения.

В Codex откройте **Context Assets** на боковой панели задачи. В разделе Code приложения Claude Desktop панель открывается сама, когда в чате есть изображения. Чтобы открыть её снова, введите `/cam`. В остальное время можно работать без панели.

## Результаты тестирования

- **Codex.** В чате Codex с девятью ключевыми кадрами запрос вырос до 42,4 МБ и после перезапуска или сжатия истории не отправлялся. С плагином тот же запрос занимал 0,12 МБ и отправлялся.
- **Claude Code (Sonnet 5.5).** В задаче по короткометражке из 16 ходов Sonnet 5.5 после сжатия истории ответил на все 20 вопросов о картинках, которые были только в чате. Без плагина он ответил на 8 из 20. Самые большие запросы содержали 41 859 и 110 671 токен соответственно при примерно одинаковой стоимости.

Результаты и шаги для повторения есть в [тесте Codex](eval/README.md), [тесте сжатия в Claude Code](eval/compaction/README.md) и [тесте длинной задачи в Claude Code](eval/long-task/README.md).

## Как сохраняется кэш

Сервисы моделей могут брать из кэша неизменное начало диалога. Если изменить раннюю часть, содержимое после неё обрабатывается заново. Плагин вносит изменения ближе к концу разговора.

<p align="center">
  <img src="docs/images/cache-compare.svg" alt="Сравнение четырёх способов отправки длинного чата. При использовании строк с ID заново обрабатывается только оставшаяся часть предыдущего хода." width="100%">
</p>

Строка с ID появляется в ходе после картинки и остаётся на месте. При запросе оригинал добавляется к текущему ходу, а старую строку модель продолжает получать из кэша.

После хода с картинками его оставшаяся часть один раз обрабатывается заново. Модель также пишет короткое описание для каждой новой картинки. Ручное изменение старой картинки в панели один раз сбрасывает кэш начиная с этого места. В [тесте длинной задачи](eval/long-task/README.md) из кэша прочитали 87% входных данных с плагином и 91% без него.

## Поддерживаемые агенты

Codex и Claude Code проверены. Панель доступна в настольных версиях Codex и Claude. Для остальных агентов автоматический выбор доступен через адаптеры, которые пока не проверены в реальной работе.

[Codex](https://github.com/openai/codex) · [Claude Code](https://github.com/anthropics/claude-code) · [WorkBuddy](https://www.workbuddy.cn) · [OpenCode](https://github.com/anomalyco/opencode) · [Gemini CLI](https://github.com/google-gemini/gemini-cli) · [pi](https://github.com/earendil-works/pi) · [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) · [Qwen Code](https://github.com/QwenLM/qwen-code) · [Cline](https://github.com/cline/cline) · [Kilo Code](https://github.com/Kilo-Org/kilocode) · [goose](https://github.com/aaif-goose/goose) · [Cherry Studio](https://github.com/CherryHQ/cherry-studio)

Инструкции по настройке есть в [INSTALL.md](INSTALL.md#other-agents). Если попробуете один из этих адаптеров, [расскажите о результате](https://github.com/chipfighter/context-attachment-manager/issues). Для подключения своего агента см. [ADAPTERS.md](ADAPTERS.md).

## Частые вопросы

### Почему длинный чат с картинками замедляется?

Каждое новое сообщение может заново отправлять все старые картинки. По мере их накопления запрос растёт, а иногда вообще перестаёт отправляться.

### Чем это отличается от сжатия истории или уменьшения картинок?

Сжатие и удаление ранних сообщений меняют старую часть чата. Уменьшение меняет сами изображения. Плагин сохраняет короткую строку с ID и возвращает по ней исходное изображение.

### Модель сможет найти старую картинку после сжатия?

Да. У каждой картинки есть ID, например `IMG-001`, и короткое описание с категорией, названием и персонажами. По ID модель может запросить оригинал.

### Что происходит с серией скриншотов?

Если инструмент вернул много скриншотов за один ход, старые заменяются строками с ID группами, а несколько самых свежих отправляются как есть. Модель может описать похожие скриншоты одной строкой и запросить любой по ID.

### Поддерживаются ли PDF?

В Claude Code при включённом **Auto-select** ранее прочитанный PDF заменяется строкой с ID, например `PDF-001`. Модель запрашивает нужные страницы по ID и номеру. Это работает с текстовыми PDF и сканами. В Codex страницы, преобразованные в картинки, обрабатываются как обычные изображения.

### Удаляются ли мои изображения и куда отправляются запросы?

Плагин работает локально. Оригиналы и история остаются на месте, а запросы идут в тот же сервис, которым уже пользуется агент. Проверка обновлений на GitHub не отправляет сведения о вас. Её можно отключить на панели.

### Нужен ли терминал и сколько стоит плагин?

Попросите агента установить плагин или откройте страницу Plugins в Codex. Для ручной установки см. [INSTALL.md](INSTALL.md). Плагин бесплатный и открыт по лицензии MIT.

<p align="center"><sub><a href="CHANGELOG.md">История изменений</a> · <a href="CONTRIBUTING.md">Как помочь проекту</a> · <a href="LICENSE">Лицензия MIT</a></sub></p>
