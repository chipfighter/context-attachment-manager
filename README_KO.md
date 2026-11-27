<p align="center">
  <img src="plugin/assets/logo.png" width="96" height="96" alt="Context Attachment Manager 아이콘">
</p>

<h1 align="center">Context Attachment Manager</h1>

<p align="center"><b>Codex와 Claude Code에서 이미지가 많은 긴 대화도 느려지지 않게.</b><br>이전 이미지는 번호가 붙은 한 줄짜리 텍스트로 바뀝니다. 모델이 다시 봐야 할 때는 번호로 원본을 불러오고, 대화가 압축된 뒤에도 마찬가지입니다.</p>

<p align="center">
  <a href="https://github.com/chipfighter/context-attachment-manager/releases"><img src="https://img.shields.io/github/v/release/chipfighter/context-attachment-manager?include_prereleases" alt="릴리스"></a>
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="지원 운영체제는 Windows, macOS, Linux입니다">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT 라이선스"></a>
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README_CN.md">简体中文</a> · <a href="README_TW.md">繁體中文</a> · <a href="README_JA.md">日本語</a> · <b>한국어</b> · <a href="README_VI.md">Tiếng Việt</a><br>
  <a href="README_ES.md">Español</a> · <a href="README_PT_BR.md">Português (Brasil)</a> · <a href="README_FR.md">Français</a> · <a href="README_DE.md">Deutsch</a> · <a href="README_IT.md">Italiano</a> · <a href="README_PL.md">Polski</a><br>
  <a href="README_RU.md">Русский</a> · <a href="README_TR.md">Türkçe</a> · <a href="README_AR.md">العربية</a> · <a href="README_HI.md">हिन्दी</a> · <a href="README_ID.md">Bahasa Indonesia</a> · <a href="README_TH.md">ไทย</a>
</p>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/hero-dark.gif">
    <img src="docs/images/hero.gif" alt="세 부분으로 된 반복 애니메이션. 첫째, 메시지를 보낼 때마다 이전 이미지를 모두 다시 보내 키프레임 24개가 쌓이고, 요청 크기가 15.6 MB까지 커지며 빨간색으로 바뀝니다. 둘째, 플러그인을 켜면 이전 이미지가 “IMG-004 Street” 같은 한 줄짜리 번호 텍스트로 바뀌고, 고정한 캐릭터 설정화만 그대로 전송되어 요청이 1.3 MB로 줄어듭니다. 셋째, 모델이 번호로 IMG-007을 불러옵니다. 원본은 현재 턴의 끝에 추가되고, 번호 텍스트는 원래 자리에 남으며, 그 위의 내용은 캐시에서 읽습니다." width="100%">
  </picture>
</p>

<table>
  <tr>
    <td align="center" width="33%"><h3>42.4 MB → 0.12 MB</h3>키프레임 9개가 있는<br>Codex 대화의 요청 하나</td>
    <td align="center" width="33%"><h3>20/20 대 8/20</h3>압축 뒤 이미지에 관한<br>질문의 정답 수(Sonnet 5.5)</td>
    <td align="center" width="33%"><h3>비용은 거의 같음</h3>가장 큰 요청: 41,859<br>대 110,671 토큰</td>
  </tr>
</table>

## 세 단계로 시작하기

**1. 설치하기.** 아래 문장을 에이전트에게 보내세요. 에이전트가 실행 중인 플랫폼을 확인해 그에 맞게 설치합니다.

```text
https://github.com/chipfighter/context-attachment-manager/blob/main/INSTALL.md 의 안내에 따라 Context Attachment Manager를 설치해 줘.
```

설치가 끝나면 에이전트를 다시 시작하세요. Claude Desktop에서는 새 Code 세션을 시작하면 됩니다. 직접 설치하려면 [설치, 업데이트 및 제거 안내](INSTALL.md)(영어)를 참고하세요. 그 뒤로 Codex와 Claude Code에서는 스스로 업데이트됩니다. 새 버전은 백그라운드에서 설치되고 다음 실행부터 적용됩니다.

**2. 평소처럼 작업하기.** 플러그인은 기본으로 켜져 있습니다. 이전 턴의 이미지는 한 줄짜리 텍스트로 바뀌어 전송되고, 새 이미지와 고정한 참고 이미지는 그대로 전송됩니다. 이미지를 대신하는 텍스트는 다음과 같습니다.

```text
[Image IMG-004 omitted | shot-1.png | generated image | turn 2 | 505×505]
Features: place: Street | Qinghe | medium shot, umbrella, lanterns
For the original, call cam_view_image with "IMG-004".
```

**3. 모델이 번호로 불러오기.** 모델이 이전 이미지를 다시 봐야 할 때 번호로 원본을 불러옵니다. 대화가 압축된 뒤에도 마찬가지입니다. 아무것도 삭제하지 않으며, 이미지와 대화 기록은 내 컴퓨터에 남습니다.

## 패널: 캐릭터와 장소별로 보기

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/panel-dark.png">
    <img src="docs/images/panel.png" alt="패널입니다. 왼쪽은 장소별 보기로 Street, Railing, Courtyard 등 장소 카드 6개가 있습니다. 오른쪽은 캐릭터 Qinghe를 연 화면으로, 설정화가 맨 앞에 있고 그 아래에 거리에서 찍은 컷이 있습니다. 아래쪽에는 다음 요청이 15.6 MB가 아니라 1.3 MB로 91% 작다고 표시됩니다." width="100%">
  </picture>
</p>

패널을 열지 않아도 플러그인은 작동합니다. 직접 관리하고 싶을 때 여세요.

- **캐릭터와 장소별로 보기** — 이미지가 캐릭터, 장소, 화면, 문서로 나뉘고 이름마다 카드가 하나씩 만들어집니다. 캐릭터를 열면 설정화가 맨 앞에, 그 뒤에 등장 컷이 장소별로 정리되어 있습니다.
- **기억나는 단서로 이미지 찾기** — “비 오는 밤”이나 “얼굴이 가장 잘 나온 컷”처럼 기억나는 특징이나 의견으로 검색하세요.
- **중요한 참고 이미지 고정하기** — 이미지를 열고 **Send every turn**(매번 보내기)을 선택하세요.
- **보낼 이미지 직접 선택하기** — **Auto-select**(자동 선택)를 끈 다음, 다음 메시지에 포함할 이미지를 고르세요.

**Codex**에서는 작업의 사이드 패널에서 **Context Assets**를 엽니다. **Claude Desktop의 Code 탭**에서는 이미지가 있으면 패널이 자동으로 열립니다. 다시 열려면 `/cam`을 입력하세요.

## 테스트 결과

- **Codex** — 키프레임 9개가 포함된 대화의 요청 크기가 42.4 MB까지 커졌고, Codex를 다시 시작하거나 대화를 압축한 뒤에는 요청을 전송할 수 없었습니다. 플러그인을 사용했을 때 같은 요청의 크기는 0.12 MB였습니다.
- **Claude Code(Sonnet 5.5)** — 이미지가 대화 안에만 있는 16턴짜리 단편 영상 작업에서 대화를 압축한 뒤 그 이미지들에 대해 질문했습니다. 플러그인을 사용했을 때는 20문제를 모두 맞혔고, 사용하지 않았을 때는 8문제만 맞혔습니다. 가장 큰 요청은 110,671 토큰이 아니라 41,859 토큰이었고, 비용은 거의 같았습니다.

결과와 재현 방법은 [Codex 비교 테스트](eval/README.md)(영어), [Claude Code 압축 비교 테스트](eval/compaction/README.md)(영어), [Claude Code 장시간 작업 비교 테스트](eval/long-task/README.md)(영어)에서 확인할 수 있습니다.

## 작동 원리: 캐시를 최대한 유지하기

모델 서비스는 대화의 앞부분을 캐시합니다. 요청의 앞부분이 직전 요청과 완전히 같으면 그 부분은 캐시에서 읽어 오므로 더 빠르고 비용도 훨씬 적게 듭니다. 대화 앞쪽의 내용이 바뀌면 바뀐 지점부터 뒤는 모두 다시 처리해야 합니다. 이 플러그인은 바꾸는 위치를 최대한 뒤쪽에 둡니다.

<p align="center">
  <img src="docs/images/cache-compare.svg" alt="이미지가 많은 긴 대화를 다루는 네 가지 방법을 다음 요청으로 그린 그림. 전부 보내면 캐시는 유지되지만 모든 이미지를 매번 다시 보냅니다. 이미지를 줄이거나 앞쪽 기록을 버리면 대화의 거의 전부를 다시 처리합니다. 이 플러그인의 대체 텍스트를 쓰면 직전 턴의 나머지 부분만 다시 처리합니다." width="100%">
</p>

- **대체 텍스트는 한 번만 작성** — 이미지는 등장한 다음 턴에 짧은 텍스트로 바뀌고, 그 뒤로는 요청마다 같은 텍스트가 그대로 전송됩니다.
- **불러와도 앞부분은 그대로** — 원본은 현재 턴의 끝에 추가되고 대체 텍스트는 원래 자리에 남으므로, 그 이전의 턴은 계속 캐시에서 읽습니다.
- **돌아오는 것은 원본** — 축소한 사본이나 요약이 아닙니다.

<details>
<summary>불러오는 과정과 비용</summary>

<p align="center">
  <img src="docs/images/cache-fetch.svg" alt="모델이 IMG-001을 불러오면 원본은 현재 턴의 끝에 추가되고 1턴의 대체 텍스트는 그대로 남아, 이전 턴은 모두 캐시에서 읽습니다. 다음 턴에는 불러온 사본이 한 줄 설명으로 바뀌고, 그 뒤의 내용만 다시 처리합니다." width="100%">
</p>

비용이 전혀 없는 것은 아닙니다. 이미지가 있던 턴이 끝나면 그 턴의 나머지 부분을 한 번 다시 처리하고, 모델은 새 이미지마다 짧은 한 줄을 씁니다. 패널에서 예전 이미지의 설정(선택 해제, 다시 선택, **Send every turn**)을 바꾸면 대화가 그 이미지 위치에서 달라지므로 그 뒤를 한 번 다시 처리합니다. [Claude Code 장시간 작업 비교 테스트](eval/long-task/README.md)(영어)에서 캐시에서 읽은 입력의 비율은 플러그인을 사용했을 때 87%, 사용하지 않았을 때 91%였습니다.

에이전트 자체의 압축이나 API 쪽에서 오래된 도구 결과를 지우는 기능(예: Anthropic의 context editing)은 앞쪽 내용을 없애므로 그 뒤는 다시 처리됩니다. 첫 번째 그림의 세 번째 줄이 여기에 해당합니다.

</details>

## 지원 에이전트

Codex와 Claude Code는 실제로 테스트했습니다. 패널은 Codex와 Claude Desktop에서 사용할 수 있습니다. 나머지 에이전트도 각 플랫폼의 코드와 문서를 바탕으로 만든 어댑터를 통해 지원하며, 실제 환경에서는 아직 테스트하지 않았습니다. 아래 에이전트 중 하나를 사용 중이라면 잘 작동했는지 여부와 관계없이 [사용 결과를 알려 주세요](https://github.com/chipfighter/context-attachment-manager/issues).

| 에이전트 | 소개 | 지원 범위 |
|---|---|---|
| [Codex](https://github.com/openai/codex) | OpenAI의 데스크톱 및 명령줄 코딩 에이전트 | 자동 선택 및 패널, 테스트 완료 |
| [Claude Code](https://github.com/anthropics/claude-code) | Anthropic의 데스크톱 및 명령줄 코딩 에이전트 | 자동 선택 및 패널(데스크톱), 테스트 완료 |
| [WorkBuddy](https://www.workbuddy.cn) | CodeBuddy를 내장한 Tencent의 데스크톱 AI 업무 도우미 | 자동 선택, 아직 테스트하지 않음 |
| [OpenCode](https://github.com/anomalyco/opencode) | 다양한 모델 제공업체를 연결할 수 있는 오픈소스 터미널 코딩 에이전트 | 자동 선택, 아직 테스트하지 않음 |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) | Google의 오픈소스 터미널 에이전트 | 자동 선택, 아직 테스트하지 않음 |
| [pi](https://github.com/earendil-works/pi) | 간결하고 확장 가능한 터미널 코딩 에이전트 | 자동 선택(pi 확장), 아직 테스트하지 않음 |
| [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) | 모든 구성 요소가 플러그인인 DeepSeek의 에이전트 프레임워크 | 자동 선택(dsh 플러그인), 아직 테스트하지 않음 |
| [Qwen Code](https://github.com/QwenLM/qwen-code) | Qwen의 오픈소스 터미널 에이전트 | 자동 선택, 아직 테스트하지 않음 |
| [Cline](https://github.com/cline/cline) | VS Code, JetBrains, 터미널에서 사용할 수 있는 오픈소스 코딩 에이전트 | 자동 선택, 아직 테스트하지 않음 |
| [Kilo Code](https://github.com/Kilo-Org/kilocode) | VS Code, JetBrains, 터미널에서 사용할 수 있는 오픈소스 코딩 에이전트 | 자동 선택, 아직 테스트하지 않음 |
| [goose](https://github.com/aaif-goose/goose) | MCP로 확장할 수 있는 오픈소스 데스크톱 및 터미널 에이전트 | 자동 선택, 아직 테스트하지 않음 |
| [Cherry Studio](https://github.com/CherryHQ/cherry-studio) | 여러 모델을 사용할 수 있는 오픈소스 데스크톱 채팅 앱 | 자동 선택, 아직 테스트하지 않음 |

위 에이전트의 설치 방법은 [INSTALL.md](INSTALL.md#other-agents)(영어)에 있습니다. 다른 에이전트를 연결하려면 [어댑터 안내](ADAPTERS.md)(영어)를 참고하세요.

## 자주 묻는 질문

### Codex나 Claude Code에서 이미지가 많은 대화는 왜 느려지나요?

에이전트는 메시지를 보낼 때마다 앞서 보낸 이미지를 모두 다시 전송합니다. 이미지가 쌓이면 대화가 느려지고, 결국 메시지를 보내지 못할 수도 있습니다. Codex에서 키프레임 9개가 포함된 대화의 요청 크기가 42.4 MB까지 커졌고, Codex를 다시 시작하거나 대화를 압축한 뒤에는 요청을 전송할 수 없었습니다. Context Attachment Manager를 사용했을 때 같은 요청의 크기는 0.12 MB였습니다.

### Context Attachment Manager를 쓰면 프롬프트 캐시가 깨지나요?

영향은 아주 작습니다. 이미지를 대신하는 텍스트는 한 번만 작성되고 그 뒤로 바뀌지 않으며, 불러온 원본은 현재 턴의 끝에 추가되므로 그 이전의 턴은 계속 캐시에서 읽습니다. 이미지가 있던 턴이 끝나면 그 턴의 나머지 부분을 한 번 다시 처리합니다. Claude Code 장시간 작업 비교 테스트에서 캐시에서 읽은 입력의 비율은 플러그인을 사용했을 때 87%, 사용하지 않았을 때 91%였습니다.

### 대화 압축이나 이미지 축소와는 무엇이 다른가요?

대화 압축이나 초기 기록 삭제는 대화의 앞쪽 내용을 없애고, 이미지 축소는 앞쪽 내용을 바꿉니다. 어느 쪽이든 대화의 거의 전부를 다시 처리해야 하고, 모델에게는 요약이나 축소한 사본만 남습니다. Context Attachment Manager에서는 직전 턴의 나머지 부분만 다시 처리하고, 모델은 번호로 원본 이미지를 불러옵니다.

### 대화가 압축된 뒤에도 모델이 이전 이미지를 구분할 수 있나요?

네. 이미지마다 `IMG-001` 같은 번호가 붙고, 모델은 이미지마다 특징(종류, 이름, 화면 속 캐릭터)을 한 줄로 기록합니다. 이 내용은 이미지를 대신하는 텍스트에 들어 있어 압축된 뒤에도 남습니다. 다시 봐야 할 때는 번호로 원본을 불러옵니다.

### 컴퓨터 조작이나 브라우저 조작에서 나오는 많은 스크린샷도 관리할 수 있나요?

네. 한 턴에서 도구가 스크린샷을 많이 돌려주면, 오래된 것부터 묶어서 텍스트로 바뀌고 가장 최근 몇 장은 그대로 전송됩니다. 모델은 비슷한 스크린샷 여러 장을 한 줄로 기록할 수 있고, 어느 것이든 번호로 다시 불러올 수 있습니다.

### PDF도 관리할 수 있나요?

Claude Code에서는 됩니다. Claude Code가 읽은 PDF는 메시지를 보낼 때마다 파일 전체가 다시 전송됩니다. **Auto-select**가 켜져 있으면 이전 턴에서 읽은 PDF는 `PDF-001` 같은 ID가 붙은 짧은 텍스트로 바뀌고, 모델은 필요할 때 ID와 페이지 번호로 그 페이지만 다시 가져옵니다. 텍스트 PDF와 스캔본 모두 됩니다. Codex는 PDF 파일 자체를 모델에 보내지 않으며, 그곳에서 이미지로 바뀐 페이지는 다른 이미지처럼 관리됩니다.

### 이미지가 삭제되거나 다른 곳으로 전송되나요?

아니요. 플러그인은 내 컴퓨터에서 실행됩니다. 원본 이미지와 대화 기록은 그대로 남고, 요청은 에이전트가 원래 사용하던 서비스로 전송됩니다. 이 요청 외에는 하루에 한 번쯤 GitHub에 새 버전이 있는지 확인합니다. 이 확인에는 사용자 정보가 담기지 않으며, 자동 업데이트는 패널에서 끌 수 있습니다.

### 어떤 에이전트에서 쓸 수 있나요? 무료인가요?

Codex와 Claude Code는 테스트를 마쳤습니다. WorkBuddy, OpenCode, Gemini CLI, pi, DeepSeek Harness, Qwen Code, Cline, Kilo Code, goose, Cherry Studio는 어댑터로 지원하지만 아직 테스트하지 않았습니다. MIT 라이선스의 오픈소스이며 무료입니다.

### 어떻게 설치하나요? 터미널이 필요한가요?

필요하지 않습니다. 위 [세 단계로 시작하기](#세-단계로-시작하기)에 있는 문장을 에이전트에게 보내면, 에이전트가 실행 중인 플랫폼을 확인해 직접 설치합니다. 설치가 끝나면 에이전트만 다시 시작하면 됩니다. Claude Desktop에서는 새 Code 세션을 시작하세요. Codex에서는 플러그인 페이지에서 몇 번의 클릭으로 설치할 수도 있습니다. 직접 설치하려면 Codex에서는 명령 한 줄, Claude Desktop에서는 `claude` 명령 두 줄이면 됩니다. 자세한 내용은 [INSTALL.md](INSTALL.md)(영어)를 참고하세요.

<p align="center"><sub><a href="CHANGELOG.md">변경 기록</a> · <a href="CONTRIBUTING.md">기여하기</a> · <a href="LICENSE">MIT 라이선스</a></sub></p>
