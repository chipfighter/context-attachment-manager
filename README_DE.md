<p align="center">
  <img src="plugin/assets/logo.png" width="96" height="96" alt="">
</p>

<h1 align="center">Context Attachment Manager</h1>

<p align="center"><b>Ein lokales Plugin für Chats mit vielen Bildern in Codex, Claude Code und anderen Agenten.</b><br>Frühere Bilder werden nicht mehr mit jeder Nachricht erneut gesendet. Das Modell ruft das benötigte Bild über seine ID ab, auch nachdem der Chat komprimiert wurde.</p>

<p align="center">
  <a href="https://github.com/chipfighter/context-attachment-manager/releases"><img src="https://img.shields.io/github/v/release/chipfighter/context-attachment-manager?include_prereleases" alt="Version"></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="Unterstützt Windows, macOS und Linux">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT-Lizenz"></a>
</p>

<p align="center"><a href="README.md">English</a> · <a href="README_CN.md">简体中文</a> · <a href="README_JA.md">日本語</a> · <a href="README_KO.md">한국어</a> · <a href="README_ES.md">Español</a> · <a href="README_PT_BR.md">Português (Brasil)</a> · <a href="README_FR.md">Français</a> · <b>Deutsch</b></p>

<p align="center">
  <img src="docs/images/loop.gif" alt="Das Panel zeigt eine Aufgabe mit 15 Keyframes. Bei aktivierter automatischer Auswahl werden frühere Bilder ausgegraut und die nächste Anfrage schrumpft von 7,5 MB auf 1,7 MB." width="100%">
</p>

## So funktioniert es

Normalerweise sendet ein Agent mit jeder Nachricht alle früheren Bilder erneut. Dadurch werden lange Chats mit vielen Bildern immer langsamer. Irgendwann lassen sich Nachrichten unter Umständen nicht mehr senden. Das Plugin gibt jedem Bild eine ID (`IMG-001`, `IMG-002` …) und sendet für frühere Bilder nur kurze Platzhalter.

- **Das Modell holt Bilder bei Bedarf.** Wenn es ein früheres Bild erneut ansehen muss, ruft es das Original über die ID ab.
- **Das Modell kann Bilder auseinanderhalten.** Es hält in einer Zeile fest, was jedes Bild zeigt, und merkt sich deine Kommentare dazu. Beides bleibt im Platzhalter erhalten, auch wenn der Chat komprimiert wird.
- **Die Originale bleiben erhalten.** Deine Bilder und der Chatverlauf bleiben unverändert.

Das Plugin ist standardmäßig aktiv, auch wenn du das Panel nicht öffnest. Es eignet sich zum Beispiel für die Arbeit mit Bildern, Videos und gescannten Dokumenten sowie für Aufgaben am Computer oder im Browser.

## Installation

Schick deinem Agenten die folgende Nachricht. Er erkennt, auf welcher Plattform er läuft, und richtet das Plugin passend ein.

```text
Installiere Context Attachment Manager für mich nach der Anleitung unter https://github.com/chipfighter/context-attachment-manager/blob/main/INSTALL.md
```

Starte den Agenten danach neu. In Claude Desktop genügt es, eine neue Code-Sitzung zu starten. Hier findest du die [unterstützten Agenten](#unterstützte-agenten) und die Anleitung zur [Installation, Aktualisierung und Deinstallation](INSTALL.md) auf Englisch.

## Bilder im Panel auswählen

<p align="center">
  <img src="docs/images/hero.png" alt="Im Panel kannst du frühere Bilder automatisch verwalten, sie anhand eines Details suchen und in einer Vorschau ansehen." width="100%">
</p>

- **Finde ein Bild** anhand eines Details oder Kommentars, an den du dich erinnerst, etwa „regnerische Nacht“ oder „bestes Gesicht“.
- **Halte ein Referenzbild griffbereit.** Öffne das Bild und aktiviere **Send every turn**, um es mit jeder Nachricht mitzusenden.
- **Wähle Bilder selbst aus.** Schalte **Auto-select** aus und wähle die Bilder für deine nächste Nachricht.

In **Codex** findest du **Context Assets** in der Seitenleiste der Aufgabe. Im **Code-Tab von Claude Desktop** öffnet sich das Panel automatisch, sobald Bilder im Chat vorhanden sind. Mit `/cam` öffnest du es erneut.

## Datenschutz

Das Plugin läuft lokal. Deine Originalbilder und der Chatverlauf bleiben auf deinem Computer. Anfragen gehen an den Dienst, den dein Agent bereits nutzt.

## Ergebnisse der Tests

In Codex wuchs ein Chat mit neun Keyframes auf 42,4 MB an. Nach einem Neustart oder einer Komprimierung des Chats schlug das Senden fehl. Mit dem Plugin waren dieselben Anfragen nur 0,12 MB groß. Die Ergebnisse und die Schritte zum Nachstellen findest du im [Codex-Vergleich](eval/README.md) und im [Vergleich zu langen Aufgaben in Claude Code](eval/long-task/README.md) auf Englisch.

## Unterstützte Agenten

Codex und Claude Code wurden getestet. Das Panel ist in Codex und Claude Desktop verfügbar. Die übrigen Agenten in der Tabelle werden über Adapter unterstützt, die auf ihrem Code und ihrer Dokumentation beruhen. Praxistests stehen noch aus. Wenn du einen davon nutzt, [erzähl uns, wie es gelaufen ist](https://github.com/chipfighter/context-attachment-manager/issues). Jede Rückmeldung hilft.

| Agent | Beschreibung | Unterstützung |
|---|---|---|
| [Codex](https://github.com/openai/codex) | Programmieragent von OpenAI für Desktop und Kommandozeile | Automatische Auswahl und Panel, getestet |
| [Claude Code](https://github.com/anthropics/claude-code) | Programmieragent von Anthropic für Desktop und Kommandozeile | Automatische Auswahl und Panel (Desktop), getestet |
| [WorkBuddy](https://www.workbuddy.cn) | KI-Assistent von Tencent für den Desktop mit integriertem CodeBuddy | Automatische Auswahl, Praxistest ausstehend |
| [OpenCode](https://github.com/anomalyco/opencode) | Open-Source-Programmieragent fürs Terminal, der mit beliebigen Modellanbietern funktioniert | Automatische Auswahl, Praxistest ausstehend |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | Open-Source-Agent von Google fürs Terminal | Automatische Auswahl, Praxistest ausstehend |
| [pi](https://github.com/earendil-works/pi) | Schlanker, erweiterbarer Programmieragent fürs Terminal | Automatische Auswahl (pi-Erweiterung), Praxistest ausstehend |
| [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) | Agenten-Framework von DeepSeek, in dem alles als Plugin umgesetzt ist | Automatische Auswahl (dsh-Plugin), Praxistest ausstehend |
| [Qwen Code](https://github.com/QwenLM/qwen-code) | Open-Source-Agent von Qwen fürs Terminal | Automatische Auswahl, Praxistest ausstehend |
| [Cline](https://github.com/cline/cline) | Open-Source-Programmieragent für VS Code, JetBrains und das Terminal | Automatische Auswahl, Praxistest ausstehend |
| [Kilo Code](https://github.com/Kilo-Org/kilocode) | Open-Source-Programmieragent für VS Code, JetBrains und das Terminal | Automatische Auswahl, Praxistest ausstehend |
| [goose](https://github.com/aaif-goose/goose) | Open-Source-Agent für Desktop und Terminal, erweiterbar per MCP | Automatische Auswahl, Praxistest ausstehend |
| [Cherry Studio](https://github.com/CherryHQ/cherry-studio) | Open-Source-Chat-App für den Desktop, die viele Modelle unterstützt | Automatische Auswahl, Praxistest ausstehend |

Die Einrichtung dieser Agenten ist in [INSTALL.md](INSTALL.md#other-agents) beschrieben. Wie du einen weiteren Agenten anbindest, steht in [ADAPTERS.md](ADAPTERS.md). Beide Anleitungen sind auf Englisch.

<p align="center"><sub><a href="CHANGELOG.md">Versionsverlauf</a> · <a href="CONTRIBUTING.md">Mitmachen</a> · <a href="LICENSE">MIT-Lizenz</a></sub></p>
