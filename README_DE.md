<p align="center">
  <img src="plugin/assets/logo.png" width="96" height="96" alt="Symbol von Context Attachment Manager">
</p>

<h1 align="center">Context Attachment Manager</h1>

<p align="center"><b>Lange Chats mit vielen Bildern in Codex und Claude Code, ohne dass sie langsam werden.</b><br>Frühere Bilder werden zu einzeiligen Platzhaltern mit einer ID. Braucht das Modell eines davon wieder, ruft es das Original über die ID ab, auch nachdem der Chat komprimiert wurde.</p>

<p align="center">
  <a href="https://github.com/chipfighter/context-attachment-manager/releases"><img src="https://img.shields.io/github/v/release/chipfighter/context-attachment-manager?include_prereleases" alt="Version"></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="Unterstützt Windows, macOS und Linux">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT-Lizenz"></a>
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README_CN.md">简体中文</a> · <a href="README_TW.md">繁體中文</a> · <a href="README_JA.md">日本語</a> · <a href="README_KO.md">한국어</a> · <a href="README_VI.md">Tiếng Việt</a><br>
  <a href="README_ES.md">Español</a> · <a href="README_PT_BR.md">Português (Brasil)</a> · <a href="README_FR.md">Français</a> · <b>Deutsch</b> · <a href="README_IT.md">Italiano</a> · <a href="README_PL.md">Polski</a><br>
  <a href="README_RU.md">Русский</a> · <a href="README_TR.md">Türkçe</a> · <a href="README_AR.md">العربية</a> · <a href="README_HI.md">हिन्दी</a> · <a href="README_ID.md">Bahasa Indonesia</a> · <a href="README_TH.md">ไทย</a>
</p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/hero-dark.gif">
    <img src="docs/images/hero.gif" alt="Animation in Schleife, in drei Teilen. Erstens: Jede Nachricht sendet alle früheren Bilder erneut; 24 Keyframes sammeln sich, die Anfrage wächst auf 15,6 MB und wird rot. Zweitens: Mit dem Plugin werden frühere Bilder zu einzeiligen Platzhaltern mit ID wie „IMG-004 Street“; nur der angeheftete Figurenentwurf geht weiter mit, und die Anfrage sinkt auf 1,3 MB. Drittens: Das Modell ruft IMG-007 über die ID ab; das Original wird am Ende der aktuellen Runde angehängt, der Platzhalter bleibt an seiner Stelle, und alles davor wird aus dem Cache gelesen." width="100%">
  </picture>
</p>

<table>
  <tr>
    <td align="center" width="33%"><h3>42,4 MB → 0,12 MB</h3>Eine Anfrage in einem Codex-Chat<br>mit neun Keyframes</td>
    <td align="center" width="33%"><h3>20/20 gegenüber 8/20</h3>Fragen zu den Bildern<br>nach der Komprimierung (Sonnet 5.5)</td>
    <td align="center" width="33%"><h3>Fast gleiche Kosten</h3>Größte Anfrage: 41.859<br>gegenüber 110.671 Tokens</td>
  </tr>
</table>

## In drei Schritten loslegen

**1. Installieren.** Schick deinem Agenten die folgende Nachricht. Er erkennt, auf welcher Plattform er läuft, und richtet das Plugin passend ein.

```text
Installiere Context Attachment Manager für mich nach der Anleitung unter https://github.com/chipfighter/context-attachment-manager/blob/main/INSTALL.md
```

Starte den Agenten danach neu. In Claude Desktop genügt es, eine neue Code-Sitzung zu starten. Wenn du es lieber von Hand machst, findest du die Anleitung zur [Installation, Aktualisierung und Deinstallation](INSTALL.md) auf Englisch. Danach hält es sich in Codex und Claude Code selbst aktuell: Neue Versionen werden im Hintergrund installiert und gelten ab dem nächsten Start des Agenten.

**2. Wie gewohnt arbeiten.** Das Plugin ist standardmäßig aktiv. Bilder aus früheren Runden gehen als einzeilige Platzhalter mit; neue Bilder und die Referenzen, die du anheftest, gehen unverändert mit. Ein Platzhalter sieht so aus:

```text
[Image IMG-004 omitted | shot-1.png | generated image | turn 2 | 505×505]
Features: place: Street | Qinghe | medium shot, umbrella, lanterns
For the original, call cam_view_image with "IMG-004".
```

**3. Das Modell ruft über die ID ab.** Muss es ein früheres Bild erneut ansehen, ruft es das Original über die ID ab, auch nach der Komprimierung. Nichts wird gelöscht, und deine Bilder und der Chatverlauf bleiben auf deinem Computer.

## Das Panel: nach Figur und Ort durchsuchen

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/panel-dark.png">
    <img src="docs/images/panel.png" alt="Das Panel. Links die Ansicht nach Orten mit sechs Karten wie Street, Railing und Courtyard. Rechts die geöffnete Figur Qinghe: zuerst ihr Entwurf, darunter ihre Einstellungen auf der Straße. Unten steht, dass die nächste Anfrage 1,3 MB statt 15,6 MB groß ist, 91 % kleiner." width="100%">
  </picture>
</p>

Das Plugin funktioniert auch ohne Panel; öffne es, wenn du selbst steuern willst:

- **Nach Figur und Ort durchsuchen.** Bilder werden nach Figuren, Orten, Bildschirmen und Dokumenten sortiert, mit einer Karte pro Name. Öffne eine Figur, um zuerst ihre Entwürfe zu sehen und danach die Einstellungen, in denen sie vorkommt, Ort für Ort.
- **Finde ein Bild** anhand eines Details oder Kommentars, an den du dich erinnerst, etwa „regnerische Nacht“ oder „bestes Gesicht“.
- **Halte ein Referenzbild griffbereit.** Öffne das Bild und aktiviere **Send every turn**, um es mit jeder Nachricht mitzusenden.
- **Wähle Bilder selbst aus.** Schalte **Auto-select** aus und wähle die Bilder für deine nächste Nachricht.

In **Codex** findest du **Context Assets** in der Seitenleiste der Aufgabe. Im **Code-Tab von Claude Desktop** öffnet sich das Panel automatisch, sobald Bilder im Chat vorhanden sind. Mit `/cam` öffnest du es erneut.

## Ergebnisse

- **Codex**: Ein Chat mit neun Keyframes wuchs auf 42,4 MB an, und nach einem Neustart oder einer Komprimierung des Chats schlug das Senden fehl. Mit dem Plugin waren dieselben Anfragen nur 0,12 MB groß.
- **Claude Code (Sonnet 5.5)**: In einer Kurzfilm-Aufgabe über 16 Runden, deren Bilder nur im Chat vorkommen, haben wir den Chat komprimiert und danach Fragen zu diesen Bildern gestellt. Mit dem Plugin waren alle 20 Antworten richtig, ohne Plugin 8 von 20. Die größte Anfrage hatte 41.859 statt 110.671 Tokens, bei fast gleichen Kosten.

Die Ergebnisse und die Schritte zum Nachstellen findest du im [Codex-Vergleich](eval/README.md), im [Vergleich zur Komprimierung in Claude Code](eval/compaction/README.md) und im [Vergleich zu langen Aufgaben in Claude Code](eval/long-task/README.md) auf Englisch.

## So funktioniert es: Der Cache bleibt nutzbar

Modelldienste speichern den Anfang eines Chats im Cache. Beginnt eine Anfrage genau wie die vorherige, wird dieser Teil aus dem Cache gelesen. Das ist schneller und deutlich günstiger. Ändert sich etwas am Anfang des Chats, wird alles nach der Änderung neu verarbeitet. Das Plugin nimmt seine Änderung so weit hinten im Chat vor wie möglich:

<p align="center">
  <img src="docs/images/cache-compare.svg" alt="Vier Wege, mit einem langen Chat voller Bilder umzugehen, jeweils als nächste Anfrage dargestellt. Alles zu senden erhält den Cache, sendet aber jedes Bild erneut. Bilder zu verkleinern oder frühen Verlauf zu verwerfen führt dazu, dass fast der ganze Chat neu verarbeitet wird. Mit den Platzhaltern des Plugins wird nur der Rest der vorherigen Runde neu verarbeitet." width="100%">
</p>

- **Ein Platzhalter wird nur einmal geschrieben.** Ein Bild wird in der Runde nach seinem Erscheinen durch den Platzhalter ersetzt, und danach bleibt er in jeder Anfrage gleich.
- **Das Abrufen ändert nichts an früheren Inhalten.** Das Original wird am Ende der aktuellen Runde angehängt, der Platzhalter bleibt an seiner Stelle, und frühere Runden werden weiterhin aus dem Cache gelesen.
- **Das Modell bekommt das Original zurück.** Keine verkleinerte Kopie und keine Zusammenfassung.

<details>
<summary>Wie das Abrufen funktioniert und was es kostet</summary>

<p align="center">
  <img src="docs/images/cache-fetch.svg" alt="Wenn das Modell IMG-001 abruft, wird das Original am Ende der aktuellen Runde angehängt und der Platzhalter in Runde 1 bleibt unverändert. Alle früheren Runden werden deshalb aus dem Cache gelesen. In der nächsten Runde wird die abgerufene Kopie zu einer einzeiligen Notiz, und nur was danach kam, wird neu verarbeitet." width="100%">
</p>

Das ist nicht kostenlos. Nach einer Runde mit Bildern wird der Rest dieser Runde einmal neu verarbeitet, und das Modell schreibt für jedes neue Bild eine kurze Zeile. Wenn du im Panel ein älteres Bild änderst (abwählen, wieder auswählen oder **Send every turn**), ändert sich der Chat an dieser Stelle, und alles danach wird einmal neu verarbeitet. In unserem [Vergleich zu langen Aufgaben in Claude Code](eval/long-task/README.md) (auf Englisch) wurden mit dem Plugin 87 % der Eingabe aus dem Cache gelesen, ohne Plugin 91 %.

Die Komprimierung des Agenten selbst und das Löschen alter Tool-Ergebnisse auf API-Seite (zum Beispiel Anthropics Context Editing) entfernen frühe Inhalte, sodass alles danach neu verarbeitet wird: Das ist die dritte Zeile der ersten Abbildung.

</details>

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

## Häufige Fragen

### Warum werden Codex und Claude Code in langen Chats mit vielen Bildern langsam?

Der Agent sendet mit jeder Nachricht alle früheren Bilder erneut. Dadurch werden lange Chats mit vielen Bildern immer langsamer, und irgendwann lassen sich Nachrichten unter Umständen nicht mehr senden. In Codex wuchs ein Chat mit neun Keyframes auf 42,4 MB an, und nach einem Neustart oder einer Komprimierung des Chats schlug das Senden fehl. Mit Context Attachment Manager waren dieselben Anfragen nur 0,12 MB groß.

### Macht Context Attachment Manager den Prompt-Cache unbrauchbar?

Kaum. Ein Platzhalter wird nur einmal geschrieben und bleibt danach gleich, und ein abgerufenes Bild wird am Ende der aktuellen Runde angehängt. Alle früheren Runden werden deshalb weiterhin aus dem Cache gelesen. Nach einer Runde mit Bildern wird der Rest dieser Runde einmal neu verarbeitet. In unserem Vergleich zu langen Aufgaben in Claude Code wurden mit dem Plugin 87 % der Eingabe aus dem Cache gelesen, ohne Plugin 91 %.

### Worin unterscheidet es sich von der Komprimierung des Chats oder vom Verkleinern der Bilder?

Die Komprimierung und das Verwerfen des frühen Verlaufs entfernen den Anfang des Chats, und das Verkleinern der Bilder verändert ihn. In beiden Fällen wird fast der gesamte Chat neu verarbeitet, und dem Modell bleibt nur eine Zusammenfassung oder eine verkleinerte Kopie. Mit Context Attachment Manager wird nur der Rest der vorherigen Runde neu verarbeitet, und das Modell ruft das Originalbild über die ID ab.

### Erkennt das Modell frühere Bilder auch nach der Komprimierung noch?

Ja. Jedes Bild hat eine ID wie `IMG-001`, und das Modell notiert zu jedem eine Zeile: Kategorie, Name und die Figuren darin. Diese Notizen bleiben nach der Komprimierung in den Platzhaltern erhalten, und das Modell ruft das Original über die ID ab, wenn es das Bild erneut ansehen muss.

### Kommt es mit den vielen Screenshots bei der Computer- und Browsersteuerung zurecht?

Ja. Wenn Tools in einer Runde viele Screenshots zurückgeben, werden die älteren schubweise zu Platzhaltern, und die neuesten gehen unverändert mit. Das Modell kann eine Reihe ähnlicher Screenshots in einer Zeile notieren und jeden davon über seine ID wieder abrufen.

### Kommt es mit PDFs zurecht?

In Claude Code ja. Ein PDF, das Claude Code liest, wird mit jeder Nachricht als ganze Datei erneut gesendet. Ist **Auto-select** an, wird ein PDF aus einer früheren Runde zu einem kurzen Platzhalter mit einer ID wie `PDF-001`, und das Modell holt sich nur die Seiten zurück, die es braucht, per ID und Seitenzahl. Das geht mit Text-PDFs und mit Scans. Codex sendet PDF-Dateien selbst nie an das Modell; dort in Bilder umgewandelte Seiten werden wie andere Bilder verwaltet.

### Werden meine Bilder gelöscht oder woandershin gesendet?

Nein. Das Plugin läuft auf deinem Computer. Deine Originalbilder und der Chatverlauf bleiben unverändert, und Anfragen gehen an den Dienst, den dein Agent bereits nutzt. Abgesehen von diesen Anfragen fragt es etwa einmal am Tag bei GitHub nach, ob es eine neue Version gibt; diese Anfrage enthält keine Informationen über dich, und du kannst die automatischen Updates im Panel ausschalten.

### Mit welchen Agenten funktioniert es? Ist es kostenlos?

Codex und Claude Code sind getestet. WorkBuddy, OpenCode, Gemini CLI, pi, DeepSeek Harness, Qwen Code, Cline, Kilo Code, goose und Cherry Studio werden über Adapter unterstützt, die wir noch nicht in der Praxis getestet haben. Das Plugin ist kostenlos und Open Source unter der MIT-Lizenz.

### Wie installiere ich es? Brauche ich ein Terminal?

Nein. Schick deinem Agenten die Nachricht aus [In drei Schritten loslegen](#in-drei-schritten-loslegen): Er erkennt, auf welcher Plattform er läuft, und richtet das Plugin selbst ein. Danach musst du den Agenten nur neu starten (in Claude Desktop genügt eine neue Code-Sitzung). In Codex kannst du es auch mit wenigen Klicks über die Plugin-Seite installieren. Wenn du es lieber von Hand machst, brauchst du in Codex einen Befehl und in Claude Desktop zwei `claude`-Befehle; siehe [INSTALL.md](INSTALL.md) (Englisch).

<p align="center"><sub><a href="CHANGELOG.md">Versionsverlauf</a> · <a href="CONTRIBUTING.md">Mitmachen</a> · <a href="LICENSE">MIT-Lizenz</a></sub></p>
