<p align="center">
  <img src="plugin/assets/logo.png" width="96" height="96" alt="Context Attachment Manager">
</p>

<h1 align="center">Context Attachment Manager</h1>

<p align="center"><b>讓 Codex 和 Claude Code 裡圖片很多的長對話保持流暢。</b><br>先前的圖片會換成一行帶有編號的佔位文字。模型要再看時，可以依編號取回原圖，對話壓縮後也一樣。</p>

<p align="center">
  <a href="https://github.com/chipfighter/context-attachment-manager/releases"><img src="https://img.shields.io/github/v/release/chipfighter/context-attachment-manager?include_prereleases" alt="GitHub Releases"></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="Windows, macOS, Linux">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT"></a>
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README_CN.md">简体中文</a> · <b>繁體中文</b> · <a href="README_JA.md">日本語</a> · <a href="README_KO.md">한국어</a> · <a href="README_VI.md">Tiếng Việt</a><br>
  <a href="README_ES.md">Español</a> · <a href="README_PT_BR.md">Português (Brasil)</a> · <a href="README_FR.md">Français</a> · <a href="README_DE.md">Deutsch</a> · <a href="README_IT.md">Italiano</a> · <a href="README_PL.md">Polski</a><br>
  <a href="README_RU.md">Русский</a> · <a href="README_TR.md">Türkçe</a> · <a href="README_AR.md">العربية</a> · <a href="README_HI.md">हिन्दी</a> · <a href="README_ID.md">Bahasa Indonesia</a> · <a href="README_TH.md">ไทย</a>
</p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/hero-dark.gif">
    <img src="docs/images/hero.gif" alt="未安裝時，每個請求都會重傳之前的圖片。安裝後，只保留已固定的參考圖，其餘圖片換成一行編號。模型需要時再依編號取回原圖。" width="100%">
  </picture>
</p>

<table>
  <tr>
    <td align="center" width="33%"><h3>42.4 MB → 0.12 MB</h3>Codex 對話含九張關鍵影格時，單次請求的大小</td>
    <td align="center" width="33%"><h3>20/20 對 8/20</h3>對話壓縮後回答圖片問題的正確數（Sonnet 5.5）</td>
    <td align="center" width="33%"><h3>費用大致相同</h3>最大的單次請求為 41,859 個 token，原本為 110,671 個</td>
  </tr>
</table>

## 三個步驟開始使用

**1. 安裝外掛。** 把下面這句話傳給你的 Agent。它會辨認目前的平台，並執行適用的安裝流程。

```text
請依照這份說明幫我安裝 Context Attachment Manager： https://github.com/chipfighter/context-attachment-manager/blob/main/INSTALL.md
```

安裝後重新啟動 Agent。若使用 Claude Desktop，開啟新的 Code 工作階段即可。手動安裝請參考英文的[安裝、更新與解除安裝說明](INSTALL.md)。Codex 和 Claude Code 之後會在背景安裝新版，在下次啟動時生效。

**2. 照常使用。** 外掛預設啟用。先前幾輪的圖片會換成一行佔位文字，新圖和你固定的參考圖仍會完整傳送。

```text
[Image IMG-004 omitted | shot-1.png | generated image | turn 2 | 505×505]
Features: place: Street | Qinghe | medium shot, umbrella, lanterns
For the original, call cam_view_image with "IMG-004".
```

**3. 模型依編號取圖。** 要再看舊圖時，模型可依編號取回原圖，壓縮對話後也能取回。原始圖片和對話紀錄都留在你的電腦。

## 在面板依角色與場景瀏覽

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/panel-dark.png">
    <img src="docs/images/panel.png" alt="左側是各個場景的卡片。右側開啟青禾的角色卡，先顯示角色設定圖，再顯示街頭畫面。" width="100%">
  </picture>
</p>

- **依類別瀏覽。** 圖片會分入角色、場景、畫面和文件等類別。打開角色卡時，先顯示造型參考圖，再依場景列出該角色出現的畫面。
- **依細節或評語找圖。** 試著輸入還記得的字詞，例如「雨夜」或「臉最好看的版本」。
- **固定參考圖。** 打開圖片，勾選 **Send every turn**。
- **自己挑選要傳送的圖。** 關閉 **Auto-select**，再勾選下一則訊息要附上的圖片。

在 Codex 的任務側欄開啟 **Context Assets**。Claude Desktop 的 Code 分頁有圖片時，面板會自動開啟。輸入 `/cam` 可再次打開。面板關閉時，外掛仍會照常運作。

## 實測結果

- **Codex.** 一段有九張關鍵影格的 Codex 對話，單次請求增長到 42.4 MB，重新啟動或壓縮後無法傳送。使用外掛後，同一請求降到 0.12 MB，並成功送出。
- **Claude Code (Sonnet 5.5).** 在一段 16 輪的短片製作任務裡，壓縮之後請 Sonnet 5.5 回答只有在對話裡才找得到的圖片細節。使用外掛時答對 20/20 題，原版答對 8/20 題。最大的請求從 110,671 降到 41,859 個 token，費用大致相同。

結果與重現步驟請見 [Codex 對照評測](eval/README_CN.md)、[Claude Code 壓縮評測](eval/compaction/README_CN.md)及 [Claude Code 長任務評測](eval/long-task/README_CN.md)。

## 如何保留提示快取

如果對話開頭沒有變，模型服務可以直接從快取讀取。修改前面的內容會讓後續部分重新處理。外掛盡量在接近對話結尾的地方做變更。

<p align="center">
  <img src="docs/images/cache-compare.svg" alt="四種送出下一次請求的方式。使用外掛的佔位文字時，只有上一輪剩下的內容需要重新處理。" width="100%">
</p>

圖片出現後的下一輪會產生一行帶編號的佔位文字，之後維持原樣。模型取圖時，原圖附在本輪的最後，舊的佔位文字仍留在原處。

有圖片的一輪結束後，該輪剩餘內容會重新處理一次，模型也會替每張新圖寫一行特徵。在面板修改舊圖片的勾選狀態，會讓那張圖之後的內容重新處理一次。[長任務評測](eval/long-task/README_CN.md)中，安裝外掛時有 87% 的輸入來自快取，未安裝時為 91%。

## 支援的平台

Codex 與 Claude Code 已經過測試，Codex 與 Claude 的桌面版可使用面板。其他 Agent 透過轉接器支援自動選圖，尚未在各自的應用程式中實測。

[Codex](https://github.com/openai/codex) · [Claude Code](https://github.com/anthropics/claude-code) · [WorkBuddy](https://www.workbuddy.cn) · [OpenCode](https://github.com/anomalyco/opencode) · [Gemini CLI](https://github.com/google-gemini/gemini-cli) · [pi](https://github.com/earendil-works/pi) · [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) · [Qwen Code](https://github.com/QwenLM/qwen-code) · [Cline](https://github.com/cline/cline) · [Kilo Code](https://github.com/Kilo-Org/kilocode) · [goose](https://github.com/aaif-goose/goose) · [Cherry Studio](https://github.com/CherryHQ/cherry-studio)

安裝方式請見 [INSTALL.md](INSTALL.md#other-agents)。如果試用了其中一項轉接器，歡迎[分享結果](https://github.com/chipfighter/context-attachment-manager/issues)。想接入其他 Agent，請參考 [ADAPTERS.md](ADAPTERS.md)。

## 常見問題

### 為什麼圖片很多的長對話會變慢？

每次送出新的訊息時，都可能再次傳送之前的圖片。圖片累積後，請求會變大，最後可能無法送出。

### 跟壓縮對話或縮小圖片有什麼差別？

壓縮會改變較早的對話，縮圖會改變圖片本身。外掛保留一行固定的佔位文字，讓模型能依編號取回原圖。

### 壓縮後還找得到之前的圖片嗎？

可以。每張圖都有像 `IMG-001` 的編號，還有包含類別、名稱和角色的簡短描述。需要時，模型可依編號取回原圖。

### 一次有很多張螢幕擷取畫面時怎麼辦？

較舊的畫面會分批換成佔位文字，最新的幾張仍會完整傳送。相近的畫面可以共用一行描述，之後仍然能依編號取回個別原圖。

### 支援 PDF 嗎？

在 Claude Code 開啟 **Auto-select** 後，先前讀過的 PDF 會換成像 `PDF-001` 的佔位文字，模型只取回需要的頁面。文字 PDF 和掃描檔都可使用。在 Codex 裡，轉成圖片的頁面會依一般圖片處理。

### 我的圖片和請求會送到哪裡？

原圖和對話紀錄留在電腦上。模型請求照常送到 Agent 本來使用的服務。外掛向 GitHub 查詢更新時不會傳送你的資料，也可以在面板關閉更新。

### 一定要用終端機嗎？外掛免費嗎？

可以請 Agent 幫你安裝，或用 Codex 的 Plugins 頁面。手動安裝請見 [INSTALL.md](INSTALL.md)。外掛以 MIT 授權開放原始碼，可免費使用。

<p align="center"><sub><a href="CHANGELOG.md">更新紀錄</a> · <a href="CONTRIBUTING.md">參與貢獻</a> · <a href="LICENSE">MIT 授權</a></sub></p>
