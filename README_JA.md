<p align="center">
  <img src="plugin/assets/logo.png" width="96" height="96" alt="">
</p>

<h1 align="center">Context Attachment Manager</h1>

<p align="center"><b>Codex、Claude Code などのエージェントで、画像が多い会話のためのローカルプラグイン。</b><br>以前の画像をメッセージごとに送り直しません。必要な画像はモデルが ID で取り出します。会話を圧縮したあとも同じです。</p>

<p align="center">
  <a href="https://github.com/chipfighter/context-attachment-manager/releases"><img src="https://img.shields.io/github/v/release/chipfighter/context-attachment-manager?include_prereleases" alt="リリース"></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="対応 OS：Windows、macOS、Linux">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT ライセンス"></a>
</p>

<p align="center"><a href="README.md">English</a> · <a href="README_CN.md">简体中文</a> · <b>日本語</b> · <a href="README_KO.md">한국어</a> · <a href="README_ES.md">Español</a> · <a href="README_PT_BR.md">Português (Brasil)</a> · <a href="README_FR.md">Français</a> · <a href="README_DE.md">Deutsch</a></p>

<p align="center">
  <img src="docs/images/loop.gif" alt="15 枚のキーフレームがあるタスクのパネル。自動選択をオンにすると以前の画像が灰色になり、次のリクエストが 7.5 MB から 1.7 MB に減ります。" width="100%">
</p>

## できること

エージェントは通常、メッセージを送るたびに以前の画像をすべて送り直します。画像が増えると会話は重くなり、送信できなくなることもあります。このプラグインは画像ごとに番号（`IMG-001`、`IMG-002`…）を付け、以前の画像の代わりに短いプレースホルダーを送ります。

- **必要な画像だけ取り出す**：以前の画像をもう一度見る必要があるとき、モデルが ID で元画像を取り出します。
- **どの画像か見分けられる**：モデルが画像ごとに見た目の特徴を一行で記録し、あなたの評価も残します。これはプレースホルダーに入るので、会話を圧縮したあとも残ります。
- **何も削除しない**：元の画像と会話履歴はそのままです。

最初からオンで、パネルを開く必要はありません。主な用途：画像・動画の制作、スキャン文書、パソコンやブラウザーの操作。

## インストール

次の文をお使いのエージェントに送ってください。実行中のプラットフォームを確認し、それに合わせてインストールします。

```text
次の手順に従って、Context Attachment Manager をインストールしてください：https://github.com/chipfighter/context-attachment-manager/blob/main/INSTALL.md
```

インストール後はエージェントを再起動してください（Claude Desktop では新しい Code セッションを始めてください）。[対応エージェント](#対応エージェント)、[インストール・更新・アンインストールの手順](INSTALL.md)（英語）もご覧ください。

## 自分で選びたいときは、パネルで

<p align="center">
  <img src="docs/images/hero.png" alt="パネル：過去の画像を自動管理し、覚えている特徴から検索して、大きくプレビューできます。" width="100%">
</p>

- **覚えていることから検索**：「雨の夜」「いちばん良い顔」など、画像の特徴や感想で探せます。
- **大切な参考画像を固定**：画像を開き、**Send every turn**（毎ターン送信）にチェックを入れます。
- **送る画像を自分で選択**：**Auto-select**（自動選択）をオフにして、次のメッセージに含める画像を選びます。

**Codex** ではタスクのサイドパネルから **Context Assets** を開きます。**Claude Desktop の Code タブ**では画像があると自動で開き、`/cam` で再び開けます。

## プライバシー

プラグインはローカルで動作します。元の画像と会話履歴は自分のコンピューターに残り、リクエストはエージェントが元から使っているサービスに送られます。

## 効果の検証

Codex では、9 枚のキーフレームがある会話が 42.4 MB になり、再起動や圧縮のあとに送信できませんでした。プラグインを入れると、同じリクエストは 0.12 MB でした。結果と再現手順は [Codex の比較検証](eval/README.md)と [Claude Code の長期タスク検証](eval/long-task/README.md)（英語）をご覧ください。

## 対応エージェント

Codex と Claude Code は動作確認済みで、Codex と Claude Desktop にはパネルもあります。ほかのエージェントにも対応しています。接続層は各エージェントのコードとドキュメントをもとに書きましたが、まだ実際には試していません。お使いの方は、動いたかどうか[ぜひ教えてください](https://github.com/chipfighter/context-attachment-manager/issues)。

| エージェント | 概要 | 対応状況 |
|---|---|---|
| [Codex](https://github.com/openai/codex) | OpenAI のコーディングエージェント（デスクトップ版・CLI） | 自動選択＋パネル、動作確認済み |
| [Claude Code](https://github.com/anthropics/claude-code) | Anthropic のコーディングエージェント（デスクトップ版・CLI） | 自動選択＋パネル（デスクトップ版）、動作確認済み |
| [WorkBuddy](https://www.workbuddy.cn) | Tencent のデスクトップ AI アシスタント（CodeBuddy 内蔵） | 自動選択、未検証 |
| [OpenCode](https://github.com/anomalyco/opencode) | どのモデルサービスにもつながるオープンソースのターミナル型エージェント | 自動選択、未検証 |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | Google のオープンソースのターミナル型エージェント | 自動選択、未検証 |
| [pi](https://github.com/earendil-works/pi) | ミニマルで拡張できるターミナル型コーディングエージェント | 自動選択（pi 拡張）、未検証 |
| [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) | すべてがプラグインの DeepSeek のエージェント基盤 | 自動選択（dsh プラグイン）、未検証 |
| [Qwen Code](https://github.com/QwenLM/qwen-code) | Qwen のオープンソースのターミナル型エージェント | 自動選択、未検証 |
| [Cline](https://github.com/cline/cline) | VS Code・JetBrains・ターミナルで使えるオープンソースのコーディングエージェント | 自動選択、未検証 |
| [Kilo Code](https://github.com/Kilo-Org/kilocode) | VS Code・JetBrains・ターミナルで使えるオープンソースのコーディングエージェント | 自動選択、未検証 |
| [goose](https://github.com/aaif-goose/goose) | MCP で拡張できる、デスクトップとターミナルのオープンソースエージェント | 自動選択、未検証 |
| [Cherry Studio](https://github.com/CherryHQ/cherry-studio) | 多くのモデルにつながるオープンソースのデスクトップ AI チャット | 自動選択、未検証 |

これらのエージェントの設定手順は [INSTALL.md](INSTALL.md#other-agents)（英語）をご覧ください。ほかのエージェントを接続するには [ADAPTERS.md](ADAPTERS.md)（英語）をご覧ください。

<p align="center"><sub><a href="CHANGELOG.md">変更履歴（英語）</a> · <a href="CONTRIBUTING.md">開発への参加（英語）</a> · <a href="LICENSE">MIT ライセンス</a></sub></p>
