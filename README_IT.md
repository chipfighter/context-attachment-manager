<p align="center">
  <img src="plugin/assets/logo.png" width="96" height="96" alt="Context Attachment Manager">
</p>

<h1 align="center">Context Attachment Manager</h1>

<p align="center"><b>Mantieni veloci le chat lunghe con molte immagini in Codex e Claude Code.</b><br>Le immagini dei turni precedenti diventano segnaposto di una riga con un ID. Quando serve rivederle, il modello recupera gli originali tramite quell’ID, anche dopo la compattazione della chat.</p>

<p align="center">
  <a href="https://github.com/chipfighter/context-attachment-manager/releases"><img src="https://img.shields.io/github/v/release/chipfighter/context-attachment-manager?include_prereleases" alt="GitHub Releases"></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="Windows, macOS, Linux">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT"></a>
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README_CN.md">简体中文</a> · <a href="README_TW.md">繁體中文</a> · <a href="README_JA.md">日本語</a> · <a href="README_KO.md">한국어</a> · <a href="README_VI.md">Tiếng Việt</a><br>
  <a href="README_ES.md">Español</a> · <a href="README_PT_BR.md">Português (Brasil)</a> · <a href="README_FR.md">Français</a> · <a href="README_DE.md">Deutsch</a> · <b>Italiano</b> · <a href="README_PL.md">Polski</a><br>
  <a href="README_RU.md">Русский</a> · <a href="README_TR.md">Türkçe</a> · <a href="README_AR.md">العربية</a> · <a href="README_HI.md">हिन्दी</a> · <a href="README_ID.md">Bahasa Indonesia</a> · <a href="README_TH.md">ไทย</a>
</p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/hero-dark.gif">
    <img src="docs/images/hero.gif" alt="Prima dell’installazione ogni richiesta reinvia le immagini precedenti. Con il plugin resta il riferimento fissato, mentre le altre immagini diventano segnaposto. Il modello recupera l’originale quando gli serve." width="100%">
  </picture>
</p>

<table>
  <tr>
    <td align="center" width="33%"><h3>42,4 MB → 0,12 MB</h3>Dimensione di una richiesta in una chat Codex con nove fotogrammi chiave</td>
    <td align="center" width="33%"><h3>20/20 contro 8/20</h3>Risposte corrette sulle immagini dopo la compattazione (Sonnet 5.5)</td>
    <td align="center" width="33%"><h3>Costo quasi identico</h3>Richiesta più grande: 41.859 invece di 110.671 token</td>
  </tr>
</table>

## Per iniziare in tre passaggi

**1. Installa il plugin.** Invia questa frase al tuo agente. Individuerà la piattaforma e seguirà la procedura adatta.

```text
Installa Context Attachment Manager per me seguendo https://github.com/chipfighter/context-attachment-manager/blob/main/INSTALL.md
```

Poi riavvia l’agente. In Claude Desktop apri una nuova sessione Code. Per fare a mano, consulta la [guida all’installazione, all’aggiornamento e alla rimozione](INSTALL.md), in inglese. In Codex e Claude Code le nuove versioni si installano in background e diventano attive al riavvio.

**2. Lavora come al solito.** Il plugin è attivo per impostazione predefinita. Le immagini precedenti diventano segnaposto, mentre le nuove immagini e i riferimenti fissati vengono inviati per intero.

```text
[Image IMG-004 omitted | shot-1.png | generated image | turn 2 | 505×505]
Features: place: Street | Qinghe | medium shot, umbrella, lanterns
For the original, call cam_view_image with "IMG-004".
```

**3. Il modello recupera l’originale per ID.** Quando serve rivedere un’immagine precedente, può recuperarla anche dopo la compattazione. Le immagini e la cronologia restano sul tuo computer.

## Il pannello per personaggi e luoghi

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/panel-dark.png">
    <img src="docs/images/panel.png" alt="A sinistra ci sono le schede dei luoghi. A destra è aperta la scheda di Qinghe, con i riferimenti del personaggio e poi le inquadrature in strada." width="100%">
  </picture>
</p>

- **Sfoglia per categoria.** Le immagini sono raccolte in personaggi, luoghi, schermate e documenti. Una scheda personaggio mostra prima i suoi riferimenti, poi le inquadrature in cui appare, suddivise per luogo.
- **Cerca per dettaglio o commento.** Scrivi quello che ricordi, per esempio «notte di pioggia» o «il viso migliore».
- **Tieni visibile un riferimento.** Apri un’immagine e seleziona **Send every turn**.
- **Scegli tu le immagini.** Disattiva **Auto-select** e seleziona quelle da inviare con il prossimo messaggio.

In Codex apri **Context Assets** nel pannello laterale dell’attività. Nella scheda Code di Claude Desktop il pannello si apre da solo quando ci sono immagini. Per riaprirlo, digita `/cam`. Il plugin funziona anche a pannello chiuso.

## Risultati

- **Codex.** In una chat Codex con nove fotogrammi chiave la richiesta è arrivata a 42,4 MB. Dopo un riavvio o la compattazione non partiva più. Con il plugin la stessa richiesta è partita e pesava 0,12 MB.
- **Claude Code (Sonnet 5.5).** In un lavoro di 16 turni su un cortometraggio, Sonnet 5.5 ha risposto correttamente a 20 domande su 20 sulle immagini presenti solo nella chat dopo averla compattata, contro 8 su 20 senza plugin. La richiesta più grande è passata da 110.671 a 41.859 token, a costo quasi identico.

Risultati e istruzioni per ripetere le prove nel [confronto Codex](eval/README.md), nel [test di compattazione di Claude Code](eval/compaction/README.md) e nel [test di un’attività lunga in Claude Code](eval/long-task/README.md).

## Come viene preservata la cache

Il servizio del modello può riutilizzare dalla cache l’inizio della conversazione finché resta identico. Quando cambia un punto precedente, il contenuto successivo viene elaborato di nuovo. Il plugin interviene il più tardi possibile nella conversazione.

<p align="center">
  <img src="docs/images/cache-compare.svg" alt="Quattro modi di inviare la richiesta successiva. Con i segnaposto del plugin viene rielaborata solo la parte restante del turno precedente." width="100%">
</p>

Il segnaposto viene scritto nel turno successivo all’immagine e resta stabile. Quando il modello recupera un originale, lo aggiunge alla fine del turno corrente e lascia al suo posto il segnaposto precedente.

Dopo un turno con immagini, la parte restante di quel turno viene rielaborata una volta e il modello scrive una breve descrizione per ogni nuova immagine. Cambiare una vecchia selezione dal pannello fa rielaborare una volta il contenuto successivo. Nel [test di un’attività lunga](eval/long-task/README.md), l’87% dell’input è stato letto dalla cache con il plugin e il 91% senza.

## Agenti supportati

Codex e Claude Code sono stati testati. Il pannello è disponibile in Codex e Claude Desktop. Per gli altri agenti la selezione automatica passa da adattatori ancora da provare nell’uso reale.

[Codex](https://github.com/openai/codex) · [Claude Code](https://github.com/anthropics/claude-code) · [WorkBuddy](https://www.workbuddy.cn) · [OpenCode](https://github.com/anomalyco/opencode) · [Gemini CLI](https://github.com/google-gemini/gemini-cli) · [pi](https://github.com/earendil-works/pi) · [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) · [Qwen Code](https://github.com/QwenLM/qwen-code) · [Cline](https://github.com/cline/cline) · [Kilo Code](https://github.com/Kilo-Org/kilocode) · [goose](https://github.com/aaif-goose/goose) · [Cherry Studio](https://github.com/CherryHQ/cherry-studio)

Per la configurazione consulta [INSTALL.md](INSTALL.md#other-agents). Se provi uno di questi adattatori, [raccontaci come è andata](https://github.com/chipfighter/context-attachment-manager/issues). Per integrare un altro agente, vedi [ADAPTERS.md](ADAPTERS.md).

## Domande frequenti

### Perché le chat lunghe con molte immagini diventano lente?

A ogni messaggio possono essere reinviate tutte le immagini precedenti. Le richieste diventano sempre più pesanti e possono bloccarsi.

### Che differenza c’è rispetto a compattare la chat o ridurre le immagini?

La compattazione modifica la prima parte della chat. Il ridimensionamento modifica le immagini. Con il plugin, un segnaposto stabile permette di recuperare l’immagine originale.

### Si possono ritrovare le immagini dopo la compattazione?

Sì. Ogni immagine ha un ID, per esempio `IMG-001`, e una nota con categoria, nome e personaggi. Il modello può usare l’ID per recuperare l’originale.

### Come gestisce molte schermate nello stesso turno?

Il plugin sostituisce le meno recenti con segnaposto, a gruppi, e invia per intero le ultime. Il modello può descrivere una serie simile in una riga e recuperare una schermata qualsiasi per ID.

### Supporta i PDF?

In Claude Code, con **Auto-select** attivo, un PDF letto in precedenza riceve un segnaposto come `PDF-001`. Il modello recupera le pagine necessarie per ID e numero. Funziona con PDF testuali e scansioni. In Codex, le pagine convertite in immagini sono trattate come le altre immagini.

### Dove finiscono le mie immagini?

Gli originali e la cronologia restano sul dispositivo. Le richieste vanno al servizio che l’agente usa già. Il controllo aggiornamenti su GitHub non trasmette dati personali e si può disattivare dal pannello.

### Serve il terminale? Il plugin è gratuito?

Puoi chiedere al tuo agente di installarlo o usare la pagina Plugins di Codex. Per l’installazione manuale consulta [INSTALL.md](INSTALL.md). Il plugin è gratuito e open source con licenza MIT.

<p align="center"><sub><a href="CHANGELOG.md">Novità</a> · <a href="CONTRIBUTING.md">Come contribuire</a> · <a href="LICENSE">Licenza MIT</a></sub></p>
