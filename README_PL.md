<p align="center">
  <img src="plugin/assets/logo.png" width="96" height="96" alt="Context Attachment Manager">
</p>

<h1 align="center">Context Attachment Manager</h1>

<p align="center"><b>Długie rozmowy pełne obrazów w Codex i Claude Code pozostają szybkie.</b><br>Obrazy z poprzednich tur zastępuje krótki wpis z identyfikatorem. Gdy model znów potrzebuje obrazu, pobiera oryginał po ID, nawet po skróceniu historii rozmowy.</p>

<p align="center">
  <a href="https://github.com/chipfighter/context-attachment-manager/releases"><img src="https://img.shields.io/github/v/release/chipfighter/context-attachment-manager?include_prereleases" alt="GitHub Releases"></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="Windows, macOS, Linux">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT"></a>
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README_CN.md">简体中文</a> · <a href="README_TW.md">繁體中文</a> · <a href="README_JA.md">日本語</a> · <a href="README_KO.md">한국어</a> · <a href="README_VI.md">Tiếng Việt</a><br>
  <a href="README_ES.md">Español</a> · <a href="README_PT_BR.md">Português (Brasil)</a> · <a href="README_FR.md">Français</a> · <a href="README_DE.md">Deutsch</a> · <a href="README_IT.md">Italiano</a> · <b>Polski</b><br>
  <a href="README_RU.md">Русский</a> · <a href="README_TR.md">Türkçe</a> · <a href="README_AR.md">العربية</a> · <a href="README_HI.md">हिन्दी</a> · <a href="README_ID.md">Bahasa Indonesia</a> · <a href="README_TH.md">ไทย</a>
</p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/hero-dark.gif">
    <img src="docs/images/hero.gif" alt="Bez wtyczki wcześniejsze obrazy są wysyłane ponownie. Z wtyczką w żądaniu pozostaje przypięty obraz, a pozostałe mają krótkie wpisy z ID. Model pobiera oryginał w razie potrzeby." width="100%">
  </picture>
</p>

<table>
  <tr>
    <td align="center" width="33%"><h3>42,4 MB → 0,12 MB</h3>Rozmiar jednego żądania w rozmowie Codex z dziewięcioma klatkami kluczowymi</td>
    <td align="center" width="33%"><h3>20/20 wobec 8/20</h3>Poprawne odpowiedzi o obrazach po skróceniu historii (Sonnet 5.5)</td>
    <td align="center" width="33%"><h3>Zbliżony koszt</h3>Największe żądanie: 41 859 zamiast 110 671 tokenów</td>
  </tr>
</table>

## Zacznij w trzech krokach

**1. Zainstaluj wtyczkę.** Wyślij agentowi poniższe polecenie. Sam rozpozna platformę i przeprowadzi instalację.

```text
Zainstaluj dla mnie Context Attachment Manager zgodnie z instrukcją https://github.com/chipfighter/context-attachment-manager/blob/main/INSTALL.md
```

Następnie uruchom agenta ponownie. W Claude Desktop rozpocznij nową sesję Code. Przy instalacji ręcznej zajrzyj do [instrukcji instalacji, aktualizacji i usuwania](INSTALL.md) po angielsku. W Codex i Claude Code nowe wersje instalują się w tle i działają od następnego uruchomienia.

**2. Pracuj jak zwykle.** Wtyczka jest domyślnie włączona. Wcześniejsze obrazy zastępuje krótkimi wpisami, a nowe i przypięte wysyła w całości.

```text
[Image IMG-004 omitted | shot-1.png | generated image | turn 2 | 505×505]
Features: place: Street | Qinghe | medium shot, umbrella, lanterns
For the original, call cam_view_image with "IMG-004".
```

**3. Model pobiera oryginał po ID.** Gdy potrzebuje ponownie obejrzeć wcześniejszy obraz, może go pobrać również po skróceniu historii. Oryginały i historia rozmów pozostają na komputerze.

## Panel z postaciami i miejscami

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/panel-dark.png">
    <img src="docs/images/panel.png" alt="Po lewej są karty lokalizacji. Po prawej otwarto kartę Qinghe z obrazem referencyjnym postaci i kadrami z ulicy." width="100%">
  </picture>
</p>

- **Przeglądaj według kategorii.** Obrazy są zebrane na kartach postaci, miejsc, ekranów i dokumentów. Karta postaci pokazuje najpierw materiały referencyjne, a potem ujęcia z tą postacią według miejsca.
- **Szukaj po szczegółach lub komentarzach.** Wystarczy zapamiętany fragment w rodzaju „deszczowa noc” lub „najlepsza twarz”.
- **Przypnij obraz referencyjny.** Otwórz obraz i zaznacz **Send every turn**.
- **Wybierz obrazy ręcznie.** Wyłącz **Auto-select** i zaznacz to, co ma być wysłane z następną wiadomością.

W Codex otwórz **Context Assets** na pasku bocznym zadania. W zakładce Code w Claude Desktop panel otwiera się automatycznie, gdy pojawią się obrazy. Aby go przywrócić, wpisz `/cam`. Wtyczka działa też przy zamkniętym panelu.

## Wyniki

- **Codex.** W rozmowie Codex z dziewięcioma klatkami kluczowymi żądanie urosło do 42,4 MB i nie wysyłało się po ponownym uruchomieniu lub skróceniu historii. Z wtyczką to samo żądanie miało 0,12 MB i zostało wysłane.
- **Claude Code (Sonnet 5.5).** W zadaniu nad krótkim filmem obejmującym 16 tur Sonnet 5.5 po skróceniu historii poprawnie odpowiedział na 20 z 20 pytań o obrazy obecne tylko w rozmowie. Bez wtyczki odpowiedział na 8 z 20. Największe żądania miały 41 859 i 110 671 tokenów przy zbliżonym koszcie.

Wyniki i sposób powtórzenia prób są w [teście Codex](eval/README.md), [teście skracania historii w Claude Code](eval/compaction/README.md) i [teście długiego zadania w Claude Code](eval/long-task/README.md).

## Jak działa pamięć podręczna

Usługa modelu może wczytać niezmieniony początek rozmowy z pamięci podręcznej. Zmiana we wcześniejszej części oznacza ponowne przetworzenie tego, co następuje po niej. Wtyczka wprowadza zmiany możliwie późno.

<p align="center">
  <img src="docs/images/cache-compare.svg" alt="Cztery sposoby wysłania kolejnego żądania. Wpisy z ID ograniczają ponowne przetwarzanie do pozostałej części poprzedniej tury." width="100%">
</p>

Wpis z identyfikatorem powstaje w turze po pojawieniu się obrazu i już się nie zmienia. Gdy model pobiera obraz, oryginał trafia na koniec bieżącej tury, a wcześniejszy wpis pozostaje na miejscu.

Po turze z obrazami trzeba raz przetworzyć ponownie jej pozostałą część. Model zapisuje też krótki opis każdego nowego obrazu. Ręczna zmiana wcześniejszego wyboru w panelu powoduje jednorazowe przeliczenie późniejszej części rozmowy. W [teście długiego zadania](eval/long-task/README.md) odczytano z pamięci podręcznej 87% wejścia z wtyczką i 91% bez niej.

## Obsługiwani agenci

Codex i Claude Code przeszły testy. Panel jest dostępny w aplikacjach Codex i Claude Desktop. Pozostali agenci obsługują automatyczny wybór przez adaptery, których jeszcze nie sprawdziliśmy w praktyce.

[Codex](https://github.com/openai/codex) · [Claude Code](https://github.com/anthropics/claude-code) · [WorkBuddy](https://www.workbuddy.cn) · [OpenCode](https://github.com/anomalyco/opencode) · [Gemini CLI](https://github.com/google-gemini/gemini-cli) · [pi](https://github.com/earendil-works/pi) · [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) · [Qwen Code](https://github.com/QwenLM/qwen-code) · [Cline](https://github.com/cline/cline) · [Kilo Code](https://github.com/Kilo-Org/kilocode) · [goose](https://github.com/aaif-goose/goose) · [Cherry Studio](https://github.com/CherryHQ/cherry-studio)

Instrukcje konfiguracji są w [INSTALL.md](INSTALL.md#other-agents). Jeśli wypróbujesz któryś adapter, [daj znać, jak poszło](https://github.com/chipfighter/context-attachment-manager/issues). Integrację kolejnego agenta opisuje [ADAPTERS.md](ADAPTERS.md).

## Najczęstsze pytania

### Dlaczego rozmowa zwalnia, gdy jest w niej wiele obrazów?

Każda nowa wiadomość może ponownie wysłać wszystkie wcześniejsze obrazy. Żądania rosną i w końcu mogą się nie wysyłać.

### Czym to się różni od skrócenia historii lub zmniejszenia obrazów?

Skrócenie zmienia wcześniejszą część rozmowy, a zmniejszanie zmienia obrazy. Wtyczka zachowuje stały wpis z ID, po którym można odzyskać oryginał.

### Czy model odnajdzie obrazy po skróceniu historii?

Tak. Każdy obraz ma ID, na przykład `IMG-001`, oraz krótki opis z kategorią, nazwą i postaciami. Model może później pobrać oryginał po ID.

### Co jeśli narzędzie zwróci wiele zrzutów w jednej turze?

Starsze zastępowane są grupami krótkich wpisów, a kilka najnowszych jest wysyłanych w całości. Model może opisać podobne zrzuty jednym wpisem i pobrać dowolny oryginał po ID.

### Czy to działa z PDF-ami?

W Claude Code z włączonym **Auto-select** poprzednio odczytany PDF ma krótki wpis, na przykład `PDF-001`, a model pobiera tylko potrzebne strony według ID i numeru. Dotyczy to tekstowych PDF-ów i skanów. W Codex strony zamienione w obrazy są traktowane tak jak inne obrazy.

### Gdzie trafiają moje obrazy?

Oryginały i historia zostają na komputerze. Żądania trafiają do usługi, z której już korzysta agent. Sprawdzanie aktualizacji na GitHubie nie wysyła informacji o użytkowniku i można je wyłączyć w panelu.

### Czy potrzebuję terminala i czy wtyczka jest darmowa?

Możesz poprosić agenta o instalację albo skorzystać ze strony Plugins w Codex. Instalację ręczną opisuje [INSTALL.md](INSTALL.md). Wtyczka jest darmowa i ma otwarty kod na licencji MIT.

<p align="center"><sub><a href="CHANGELOG.md">Historia zmian</a> · <a href="CONTRIBUTING.md">Jak się włączyć</a> · <a href="LICENSE">Licencja MIT</a></sub></p>
