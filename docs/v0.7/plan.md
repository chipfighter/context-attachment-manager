# v0.7 方案：子代理和旁聊也自动选图

> 状态：用户 2026-10-13 定，开发中。规格以 [spec.md](../spec.md) 为准，实现见 [design.md](../design.md)。

## 1. 背景与目标

- [Issue #2](https://github.com/chipfighter/context-attachment-manager/issues/2)（2026-10-12，v0.4.0，macOS 上的 Codex 桌面版）：主任务开着自动选图，它派出去的子代理和在它里面开的旁聊却不受管。子代理一个请求带 26 张图、47 MB；旁聊只问了一句文字问题，请求却带着主任务的 39 张图、48.75 MB，重连 5 次后报 `Broken pipe`。同一时间主任务自己的请求从 48.7 MB 改写到 6.3 MB。
- spec 原来写的是“子代理不单独处理……其他情况等开源后按用户反馈再定”（用户 2026-09-25），这就是等来的反馈。

## 2. 规则（用户 2026-10-13 定）

1. **开关**：主任务面板加一个开关“子代理和旁聊也自动选图”，默认开，老任务也一样。它和主任务自己的自动选图开关分开：开着时，不管主任务自己开没开自动选图，子代理和旁聊都按自动选图管；关掉就不管，请求原样发。
2. **旁聊**：用原任务的图片记录。从原任务带过来的图都换成占位，原任务里固定发送的除外，原任务这一轮正在看的也换掉。模型要看哪张，用 `cam_view_image` 去原任务里取。
3. **子代理**（启动时不带主任务历史的）：找到它的主任务（子代理再派的子代理也一路找上去），按这个开关管它自己的图：这一轮看的照发，前几轮的换成占位，要看再取。
4. **面板**：主任务面板显示它的子代理和旁聊，每个一行：名字、几张图、上次请求换掉几张、少发多少、现在按什么规则管。
5. **不做**：
   - Claude 的子代理：issue 只说了 Codex；Claude 的子代理一般一次跑完、只有一轮，按自动选图的规则本来就全发。
   - 在主任务面板里逐张勾子代理和旁聊的图（只显示统计和规则）；给每个子代理单独设开关。
   - 改“这一轮看的图照发”。
   - 带着主任务历史启动的子代理：照旧按分叉的规则继承主任务的勾选。
   - Codex 自己的后台任务（代码审查、对话压缩、记忆整理）不算子代理。
6. **发布后**在 issue #2 回复一条，告诉提问的人 0.7.0 已发布（用户 2026-10-13）。

## 3. 事实与依据

2026-10-13，本机 Codex 桌面版自带的 `codex-cli 0.162.0-alpha.2`，用测试引擎和测试 app-server 实测（`local/v07/probe.ts`）；对照 openai/codex 的源码 `codex-rs/core/src/responses_metadata.rs`、`turn_metadata.rs`、`mcp_tool_call.rs`、`tui/src/app/side.rs`。

- **旁聊是不写进硬盘的分叉**：app-server 的 `thread/fork` 带 `ephemeral: true`（这个版本还要求 `excludeTurns: true`；终端版的 `/side` 也是这样开的）。返回的任务有 `forkedFromId`（原任务）、`ephemeral: true`，没有会话记录文件。
- **旁聊的请求**：每个请求（包括开 WebSocket 的那一个）的 `x-codex-turn-metadata` 里，`thread_id` 和 `session_id` 都是旁聊自己，`forked_from_thread_id` 是原任务。
- **子代理**（`spawn_agent`，`fork_turns: "none"`；这个参数属于 `multi_agent_v2`，本机默认关着，测试里打开）：有自己的会话记录。`session_meta` 有 `parent_thread_id`（顶层，`source.subagent.thread_spawn` 里也有）、`depth`、`agent_path`、`agent_nickname`（例如 “Franklin”），没有 `forked_from_id`。
- **子代理的请求**：`thread_id` 是子代理自己，`session_id` 是主任务，`parent_thread_id` 是父任务，`subagent_kind` 是 `thread_spawn`，`thread_source` 是 `subagent`；请求头另有 `x-codex-parent-thread-id` 和 `x-openai-subagent: collab_spawn`。
- **模型调用工具时**：`_meta.threadId` 是发起调用的那个任务（旁聊、子代理自己），`_meta["x-codex-turn-metadata"]` 里同样有 `forked_from_thread_id`、`parent_thread_id`。
- **v0.6 的情况**：子代理是新任务，按 v0.6 的默认已经开着自动选图（测试引擎记下 `auto: true`）；旁聊的请求因为找不到会话记录被原样转发（`thread index: no rollout found`），图照发，和 issue 说的一样。
- 归档主任务时，它的子代理一起归档。

## 4. 做法

- **认出来源**（`proxy.ts` 的 `requestIdentity`）：除了任务、轮次、窗口，再读 `forked_from_thread_id`、`parent_thread_id`（没有时看请求头 `x-codex-parent-thread-id`）、`subagent_kind`，一起记进请求日志。
- **开关**（`selection.ts`）：记在主任务的选择文件里（`childrenAuto`），没有就是开。面板用 `cam_set_selection` 改，模型不能改。
- **子代理**（`selection.ts` 的 `effectiveSelection`）：会话记录里有父任务、没有分叉来源的，顺着 `parent_thread_id` 找到主任务。子代理自己没有开关时，看主任务的 `childrenAuto`：开着就是自动选图，从子代理开始时算起；关着就关。
- **旁聊**（`proxy.ts`、`selection.ts`）：请求所属的任务没有会话记录、请求里又有 `forked_from_thread_id` 的，算旁聊。开关看原任务所属的主任务。开着时用原任务的图片记录改写：原任务的各轮都算之前的轮次，固定发送的照发；关着就原样转发，WebSocket 也不拦。
- **取图**（`plugin-server.ts`）：旁聊里调用 `cam_view_image` 时，按 `_meta` 里的 `forked_from_thread_id` 去原任务取；开关关着时和自动选图关着一样拒绝。
- **登记**（引擎）：看到子代理或旁聊的请求时，记在主任务名下（数据目录 `state/children/<主任务>.json`），面板按它列出，统计用各自的请求记录。
- **面板**（`panel.html`、`panel-state.ts`）：有子代理或旁聊时显示一块，标题行带开关，展开后每个一行。做完截图给用户看。

## 5. 测试

- 单元测试：请求来源的识别；子代理找到主任务（多层、带历史的不算、用户自己的任务不算）；开关开和关时子代理、旁聊的选择；旁聊的请求按原任务改写、开关关着时原样；旁聊取图；登记和面板的列表；面板文字中英文一一对应。
- Codex 自测（`spike/src/v07-children-selftest.ts`，测试引擎 + 测试 app-server，`gpt-6-sol`，推理强度 low）：
  - 旁聊：主任务看过图之后开旁聊，问一句文字问题，图都换成占位；再问图里的细节，模型取回原任务的图并答对。
  - 子代理：子代理第一轮看图，第二轮请求里那张图换成占位；问细节时模型取回并答对。
  - 开关关掉：旁聊和子代理的请求原样发。

## 6. 验收

1. 开关默认开：旁聊的请求里原任务的图换成占位，模型要看能取回；子代理前几轮的图换成占位，要看能取回。
2. 开关关掉：子代理和旁聊的请求原样发。
3. 主任务面板列出子代理和旁聊，统计和规则对得上。
4. 主任务自己的行为不变。
