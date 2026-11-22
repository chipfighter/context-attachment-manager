<p align="center">
  <img src="plugin/assets/logo.png" width="96" height="96" alt="Context Attachment Manager のアイコン">
</p>

<h1 align="center">Context Attachment Manager</h1>

<p align="center"><b>Codex や Claude Code で、画像の多い長い会話を重くしない。</b><br>以前の画像は ID 付きの一行のプレースホルダーになります。もう一度必要になると、モデルが ID で元画像を取り出します。会話を圧縮したあとも同じです。</p>

<p align="center">
  <a href="https://github.com/chipfighter/context-attachment-manager/releases"><img src="https://img.shields.io/github/v/release/chipfighter/context-attachment-manager?include_prereleases" alt="リリース"></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="対応 OS：Windows、macOS、Linux">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT ライセンス"></a>
</p>

<p align="center"><a href="README.md">English</a> · <a href="README_CN.md">简体中文</a> · <b>日本語</b> · <a href="README_KO.md">한국어</a> · <a href="README_ES.md">Español</a> · <a href="README_PT_BR.md">Português (Brasil)</a> · <a href="README_FR.md">Français</a> · <a href="README_DE.md">Deutsch</a></p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/hero-dark.gif">
    <img src="docs/images/hero.gif" alt="3 部構成のループ動画。1：メッセージのたびに以前の画像をすべて送り直し、24 枚のキーフレームがたまってリクエストは 15.6 MB に増え、赤くなります。2：プラグインを入れると、以前の画像は「IMG-004 Street」のような一行の ID プレースホルダーにまとまり、固定したキャラクター設定画だけが送られ、リクエストは 1.3 MB に減ります。3：モデルが ID で IMG-007 を取り出します。元画像は現在のターンの末尾に追加され、プレースホルダーは元の位置に残り、それより上はキャッシュから読み込まれます。" width="100%">
  </picture>
</p>

<table>
  <tr>
    <td align="center" width="33%"><h3>42.4 MB → 0.12 MB</h3>9 枚のキーフレームがある<br>Codex の会話の 1 リクエスト</td>
    <td align="center" width="33%"><h3>20/20 対 8/20</h3>圧縮後に画像について<br>質問した正解数（Sonnet 5.5）</td>
    <td align="center" width="33%"><h3>費用はほぼ同じ</h3>最大のリクエスト：41,859<br>対 110,671 トークン</td>
  </tr>
</table>

## 3 ステップで使い始める

**1. インストールする。** 次の文をお使いのエージェントに送ってください。実行中のプラットフォームを確認し、それに合わせてインストールします。

```text
次の手順に従って、Context Attachment Manager をインストールしてください：https://github.com/chipfighter/context-attachment-manager/blob/main/INSTALL.md
```

インストール後はエージェントを再起動してください（Claude Desktop では新しい Code セッションを始めてください）。手動で行う場合は[インストール・更新・アンインストールの手順](INSTALL.md)（英語）をご覧ください。

**2. いつもどおり作業する。** プラグインは最初からオンです。以前のターンの画像は一行のプレースホルダーとして送られ、新しい画像と固定した参考画像はそのまま送られます。プレースホルダーは次のような形です。

```text
[Image IMG-004 omitted | shot-1.png | generated image | turn 2 | 505×505]
Features: place: Street | Qinghe | medium shot, umbrella, lanterns
For the original, call cam_view_image with "IMG-004".
```

**3. モデルが ID で取り出す。** 以前の画像をもう一度見る必要があるとき、モデルが ID で元画像を取り出します。会話を圧縮したあとも同じです。何も削除せず、画像と会話履歴は自分のコンピューターに残ります。

## パネル：キャラクターや場所ごとに見る

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/panel-dark.png">
    <img src="docs/images/panel.png" alt="パネル。左は場所ごとの表示で、Street、Railing、Courtyard など 6 枚の場所カード。右はキャラクター Qinghe を開いたところで、設定画が先頭、その下に通りでのカット。下部には、次のリクエストが 15.6 MB ではなく 1.3 MB、91% 小さいと表示されています。" width="100%">
  </picture>
</p>

パネルを開かなくても動きます。自分で管理したいときに開いてください。

- **キャラクターや場所ごとに表示**：画像はキャラクター・場所・画面・文書に分かれ、名前ごとに 1 枚のカードになります。キャラクターを開くと、設定画が先頭に、そのあとに登場するカットが場所ごとに並びます。
- **覚えていることから検索**：「雨の夜」「いちばん良い顔」など、画像の特徴や感想で探せます。
- **大切な参考画像を固定**：画像を開き、**Send every turn**（毎ターン送信）にチェックを入れます。
- **送る画像を自分で選択**：**Auto-select**（自動選択）をオフにして、次のメッセージに含める画像を選びます。

**Codex** ではタスクのサイドパネルから **Context Assets** を開きます。**Claude Desktop の Code タブ**では画像があると自動で開き、`/cam` で再び開けます。

## 効果

- **Codex**：9 枚のキーフレームがある会話が 42.4 MB になり、再起動や圧縮のあとに送信できませんでした。プラグインを入れると、同じリクエストは 0.12 MB でした。
- **Claude Code（Sonnet 5.5）**：画像が会話の中にしかない 16 ターンの短編映像の作業で、会話を圧縮してから画像について質問しました。プラグインありでは 20 問すべて正解、なしでは 8 問の正解でした。最大のリクエストは 110,671 トークンではなく 41,859 トークンで、費用はほぼ同じでした。

結果と再現手順は [Codex の比較検証](eval/README.md)、[Claude Code の圧縮検証](eval/compaction/README.md)、[Claude Code の長期タスク検証](eval/long-task/README.md)（英語）をご覧ください。

## しくみ：キャッシュをなるべく壊さない

モデルのサービスは会話の先頭部分をキャッシュします。リクエストの先頭が前回とまったく同じなら、その部分はキャッシュから読み込まれ、速く、料金もずっと安くなります。会話の前のほうが変わると、変わった箇所から後ろはすべて処理し直しになります。このプラグインは、変える場所をできるだけ後ろにします。

<p align="center">
  <img src="docs/images/cache-compare.svg" alt="画像の多い長い会話を扱う 4 つの方法を、次のリクエストとして描いた図。すべて送る場合はキャッシュが使えますが、毎回すべての画像を送り直します。画像を縮小する方法や古い履歴を捨てる方法では、会話のほぼ全体を処理し直します。このプラグインのプレースホルダーでは、処理し直すのは前のターンの残りだけです。" width="100%">
</p>

- **プレースホルダーは一度だけ書く**：画像は、登場した次のターンでプレースホルダーに置き換わり、それ以降はどのリクエストでも同じ文面です。
- **取り出しても前の部分は変わらない**：元画像は現在のターンの末尾に追加され、プレースホルダーは元の位置に残るので、それより前のターンはキャッシュから読み込まれます。
- **戻ってくるのは元画像**：縮小したコピーでも、要約でもありません。

<details>
<summary>取り出しのしくみとコスト</summary>

<p align="center">
  <img src="docs/images/cache-fetch.svg" alt="モデルが IMG-001 を取り出すと、元画像は現在のターンの末尾に追加され、ターン 1 のプレースホルダーはそのまま残るので、それより前のターンはすべてキャッシュから読み込まれます。次のターンでは取り出したコピーが一行の説明に変わり、処理し直すのはその後ろだけです。" width="100%">
</p>

コストがないわけではありません。画像のあったターンが終わると、そのターンの残りを一度処理し直し、モデルは新しい画像ごとに短い一行を書きます。パネルで古い画像の設定（チェックを外す、戻す、**Send every turn**）を変えると、会話がその画像の位置で変わるため、それ以降を一度処理し直します。[Claude Code の長期タスク検証](eval/long-task/README.md)（英語）では、キャッシュから読み込まれた入力は、プラグインありで 87%、なしで 91% でした。

エージェント自身の圧縮や、API 側で古いツール結果を消す機能（Anthropic の context editing など）は、前のほうの内容を取り除くので、それ以降は処理し直しになります。1 つ目の図の 3 行目がこれにあたります。

</details>

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

## よくある質問

### Codex や Claude Code で、画像の多い会話が重くなるのはなぜですか？

エージェントはメッセージを送るたびに以前の画像をすべて送り直すため、画像が増えると会話は重くなり、送信できなくなることもあります。Codex では、9 枚のキーフレームがある会話が 42.4 MB になり、再起動や圧縮のあとに送信できませんでした。Context Attachment Manager を入れると、同じリクエストは 0.12 MB でした。

### Context Attachment Manager を使うと、プロンプトキャッシュは効かなくなりますか？

影響はわずかです。プレースホルダーは一度書いたら変わらず、取り出した元画像は現在のターンの末尾に追加されるので、それより前のターンはキャッシュから読み込まれます。画像のあったターンが終わると、そのターンの残りを一度処理し直します。Claude Code の長期タスク検証では、キャッシュから読み込まれた入力は、プラグインありで 87%、なしで 91% でした。

### 会話の圧縮や画像の縮小とは何が違いますか？

会話の圧縮や古い履歴の削除は会話の前のほうを取り除き、画像の縮小は前のほうを書き換えます。どちらも会話のほぼ全体が処理し直しになり、モデルの手元に残るのは要約か縮小したコピーです。Context Attachment Manager では、処理し直すのは前のターンの残りだけで、モデルは ID で元画像を取り出せます。

### 会話を圧縮したあとも、モデルは以前の画像を見分けられますか？

はい。画像には `IMG-001` のような ID が付き、モデルは画像ごとに一行の特徴（種類、名前、写っているキャラクター）を記録します。これはプレースホルダーに入るので、圧縮したあとも残ります。もう一度見る必要があるとき、モデルが ID で元画像を取り出します。

### パソコン操作やブラウザー操作の大量のスクリーンショットにも使えますか？

はい。1 つのターンでツールが多くのスクリーンショットを返すと、古いものからまとめてプレースホルダーになり、最新の数枚はそのまま送られます。似たスクリーンショットの連続はモデルが一行にまとめて記録でき、どれでも ID で取り出せます。

### 画像が削除されたり、ほかの場所に送られたりしませんか？

いいえ。プラグインはお使いのコンピューター上で動作します。元の画像と会話履歴はそのまま残り、リクエストはエージェントが元から使っているサービスに送られます。

### どのエージェントで使えますか？ 無料ですか？

Codex と Claude Code は検証済みです。WorkBuddy、OpenCode、Gemini CLI、pi、DeepSeek Harness、Qwen Code、Cline、Kilo Code、goose、Cherry Studio はアダプターで対応していますが、まだ検証していません。MIT ライセンスのオープンソースで、無料です。

### どうやってインストールしますか？ ターミナルは必要ですか？

必要ありません。上の[3 ステップで使い始める](#3-ステップで使い始める)にある一文をエージェントに送ると、エージェントが実行中のプラットフォームを確認し、自分でセットアップします。あとはエージェントを再起動するだけです（Claude Desktop では新しい Code セッションを始めてください）。Codex では、プラグインページから数回のクリックでインストールすることもできます。手動で行う場合は、Codex ではコマンド 1 つ、Claude Desktop では `claude` コマンド 2 つで済みます。詳しくは [INSTALL.md](INSTALL.md)（英語）をご覧ください。

<p align="center"><sub><a href="CHANGELOG.md">変更履歴（英語）</a> · <a href="CONTRIBUTING.md">開発への参加（英語）</a> · <a href="LICENSE">MIT ライセンス</a></sub></p>
