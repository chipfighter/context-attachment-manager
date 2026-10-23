# 技术方案

> 目标、约束和验收标准以 [spec.md](spec.md) 为准。本文件说明现在是怎么实现的、为什么这样做。
> 文中“已查证”的 Codex 行为，都针对桌面版 26.924（自带命令行 0.158），标着 v0.3 的针对 26.930（自带命令行 0.160）；Codex 更新后可能变化。第 12 节的 Claude 行为（v0.4）针对 Claude 桌面应用 2.31226，自带 Claude Code 2.1.293；思考记录部分和压缩之后（v0.5）在 Claude Code 2.1.295 上查证。
> v0.1 开发过程中的调研和排错经过，归档在 [history/v0.1/](history/v0.1/)，其中 plan.md 是当时逐步写成的完整方案。

## 1. 总体结构

在客户端和它原本使用的模型服务之间放一个只在本机监听的代理（引擎）：

1. Codex 照常把完整请求发给引擎；
2. 引擎按这个任务的勾选，把取消的图换成占位符，再转发给对应的官方或自定义服务；
3. 回复原路返回，由 Codex 照常记进同一个任务。

任务不换，历史和界面都不动，勾选和取消从下一次请求起生效。v0.4 起，Claude Code 的请求也经过同一个引擎，见第 12 节。v0.9 把平台协议和上游地址分开：中转线路绑定平台和原服务地址，按平台选择图片改写器，再发往绑定的服务，不靠域名判断是否执行 Claude 改写。

另一条路线是在新任务里重建历史（阶段 0 验证过，技术上可行）。没有采用，因为用户要在同一个任务里看到连续的对话，见 [history/v0.1/phase0-report.md](history/v0.1/phase0-report.md)。

| 部分 | 代码（`plugin/src`） | 作用 |
|---|---|---|
| 引擎 | `proxy.ts`、`engine.ts`、`routes.ts` | 本机代理：按绑定线路转发、改写请求、记录每个任务最近一次请求的统计；全机只有一个 |
| 插件服务 | `plugin-server.ts` | Codex 为每个会话启动的 MCP 服务：拉起并看守引擎，给面板提供数据；v0.3 起还给模型提供取图工具 |
| 面板 | `panel.html`、`panel-state.ts` | 侧边面板里的 MCP 应用，以及它要显示的数据 |
| 任务索引 | `thread-index.ts`、`images.ts`、`thumbnail.ts`、`png.ts`、`thread-names.ts` | 从 Codex 的任务记录里只读地找出图片和它的来源、编号、生成缩略图、读任务名 |
| 改写 | `rewrite.ts`、`selection.ts`、`request-stats.ts` | 占位符、说明和标签；勾选状态；请求统计 |
| 接入和安装 | `codexconfig.ts`、`setup.ts`、`install.ts`、`codexcli.ts`、`cam.ts`、`plugin-cache.ts` | 管理 Codex 配置里带标记的块；用 Codex 的命令行装卸插件；保护升级中的旧运行文件；`cam` 命令行 |
| 其他 | `language.ts`、`messages.ts`、`paths.ts`、`migrate-data.ts`、`binding.ts`、`entry.ts` | 语言、文字表、数据目录、旧数据迁移、新任务绑定 |
| Claude 接入（v0.4） | `hooks/register.js`（Mod，不在 `plugin/src`） | 把会话的请求地址指向引擎；`/cam` 打开面板（v0.6 起有图时自动打开）；取图工具免确认 |
| Claude 会话索引和改写（v0.4） | `claude-index.ts`、`claude-rewrite.ts` | 从 Claude Code 的会话记录找图、编号；改写 Anthropic Messages 请求 |
| Claude 思考记录（v0.4） | `claude-thinking.ts` | 账号校验思考记录时，去掉和实际发出的历史对不上的思考 |
| 面板页（v0.4） | `panel-web.js` | 引擎把 `panel.html` 作为网页提供时，代替 MCP 应用的宿主 |

引擎和插件服务之间只通过数据目录里的文件共享状态，任何一方不在，另一方都照常工作。

## 2. 接入 Codex

- **地址**：`config.toml` 顶层的 `openai_base_url = "http://localhost:17891/backend-api/codex"`。
  - 必须以 `/backend-api/codex` 结尾，否则 Codex 会关掉后端专用的接口；引擎把同样的路径转发到 `https://chatgpt.com`。
  - API key 登录的 Codex 也用这个地址（2026-10-22 用假 key 对着本机假服务实测）：请求一样发到 `…/backend-api/codex/responses`，带 `Authorization: Bearer sk-…`，没有 ChatGPT 登录才有的 `chatgpt-account-id`。chatgpt.com 不认 API key，所以引擎认出这种请求（`proxy.ts` 的 `routeOf`）后，转给 `https://api.openai.com`，路径里的 `/backend-api/codex/` 换成 `/v1/`，正是没装工具时 Codex 的默认地址。请求体同样是 Responses 请求，改写照旧。WebSocket 升级也按同样的规则转发。v0.9 对旧入口先排除 Claude 身份和矛盾标识；不能因为 Claude 的订阅令牌也以 `sk-` 开头，就把它发往 OpenAI。
  - 写 `localhost` 不写 `127.0.0.1`：Windows 代理设置里的 `<local>` 只让不带点的主机名直连。
- **`features.respect_system_proxy = true`**：让 Codex 先看 Windows 的代理设置。否则用户环境里有 `HTTP(S)_PROXY`、没有 `NO_PROXY` 时，连本机的请求也会被交给系统代理，然后失败。
- **`~/.codex/.env` 里的 `NO_PROXY`**：生图、改图的客户端只认环境变量。Codex 启动时会读 `.env`，所以在需要时写一段 `NO_PROXY=localhost,127.0.0.1,::1`，合并用户自己的条目。`.env` 可能含密钥，工具不复制、不输出它。
- **带标记的块**：上面三处都是工具自己管理、带标记的块。改之前先备份，整个文件写好再替换；恢复时只清理自己管理的块，绝不用旧备份整体覆盖（Codex 运行时自己也会写 `config.toml`）。v0.9 用户自设的 `openai_base_url` 和供应商地址按下面的线路方式接管；`respect_system_proxy = false` 仍报告冲突，不覆盖。
- **自定义服务（v0.9）**：`codexconfig.ts` 只改可安全识别的单行 `openai_base_url` 和 `model_providers.<名称>.base_url`，支持普通表和点分键。每条原地址在原位置包进 `managed upstream` 注释块，保存原行和插件写入的行；停用时，当前地址仍等于插件所写的才还原，用户后来改过的地址或增加的其他行保留。引号键、BOM、换行形式和原行可还原；三引号地址、内联供应商表等未支持写法在登记和写配置之前拒绝。外部 profile 文件和环境变量覆盖不自动改写。
  - `planEngine` 预检时只验证、生成计划；`useEngine` 先登记目标，再写配置，避免配置引用不存在的线路。供应商名称、模型、`env_key`、其他认证设置、自定义头和查询参数不改。第三方工具改了地址后，重新启用并重启 Codex，重新登记当前配置。
  - `routes.ts` 把 `{platform, baseUrl}` 存进数据目录的 `routes/`，用本机随机共享密钥的 HMAC 生成不暴露上游地址的稳定线路编号；同一配置重复登记幂等。记录不复制客户端认证头，HTTP 请求本身也不能指定任意上游；未知编号本机拒绝。
  - 本机地址是 `http://localhost:17892/__cam/routes/<编号>`。转发时去掉本机线路前缀，把原上游的协议、端口、基础路径和查询参数接回去；连接层支持 HTTP 和 HTTPS，按实际目标遵守 `NO_PROXY`。平台和目标分离，已登记线路不看密钥前缀来猜平台。
  - HTTP 和 WebSocket 都按相同线路选择目标、过滤内部头和另一平台独有的认证标识；中转本身需要的 `Authorization`、`x-api-key` 由客户端提供，不能因为域名不是官方域名就一律删掉。明确的相反平台身份会拒绝；旧入口里既认不出客户端、又不属于已知 Codex 接口的请求不再默认转给 ChatGPT。
- **经过引擎的接口**：对话走 `…/responses`（默认 WebSocket，失败时回退到 HTTP），历史压缩走 `…/responses/compact`，生图和改图走 `…/images/generations`、`…/images/edits`。
- **认出任务**：每个请求的 `x-codex-turn-metadata` 请求头里有 `thread_id`、`turn_id`。
- **往外连**：引擎沿用系统代理：Windows 读注册表；macOS 读 `scutil --proxy`，只认 HTTP(S) 代理；Linux 只看环境变量。遵守 `NO_PROXY`。
- **副作用**：地址不是官方域名时，Codex 会去掉请求里附带的工具结果元数据（`tool_result_metadata`）。这是随请求上报的内部元数据，模型看不到。

## 3. 找图和编号（任务索引）

- **图片在请求和记录里的样子**：
  - 用户上传：用户消息里依次是 `<image name=[Image #N] path="…">`、图片、`</image>` 三段。`[Image #N]` 在每条消息里都从 1 开始。
  - 工具查看和生成：Codex 的工具都经 `exec`（代码模式）调用，图片在 `custom_tool_call_output` 里。查看的文件路径写在调用代码里；生成的图后面跟着一段说明保存路径的文字。
  - 托管生图的结果（`image_generation_call.result`）是必填字段，换不成文字，所以不能取消。
  - 桌面版的评论截图：用户在 Codex 里给 PDF 或网页加评论时，用户消息里先是评论的文字（PDF 的评论带 `PDF path: …`、`PDF page: 3/12` 两行），然后每条评论一段说明、紧跟一张不带标签的图。说明的原文见第 11 节。
- **编号**：从任务的本地记录（rollout，只读）里按顺序找出所有图片出现记录，依次编号 IMG-001、IMG-002……记录只会追加，已有的编号不变。编号只由记录决定，插件服务和引擎各自计算，结果一致，不用共享状态。
- **请求和记录对得上**：请求里的消息和工具输出带着和本地记录相同的 `id`，所以按“条目 `id` + 图片在条目里的序号”就能对上，不受压缩和位置变化影响。没有 `id` 时用 `call_id`，再没有就用类型、轮次和内容哈希。
- **内容相同**：先比较 base64 内容的哈希，再比较 PNG 解码后的像素哈希。像素指纹存在数据目录的 `cache/pixels/`，引擎和各个插件服务共用，不存图片内容。
- **来源**（v0.2，`images.ts`，面板按它筛选）：
  - 一般就是图的类型：用户上传、查看的图片、工具返回、生成的图片。
  - 用户消息里的图，前一段文字是 Codex 的评论说明（第 11 节），就算 PDF 页面或网页截图。说明必须是自己单独一段、紧挨在图前面，别的文字里出现同样的话不算。
  - PDF 页面从说明里取页码。这条消息里的 `PDF path:` 只有一个路径时，取它的文件名，面板用它当名称。
  - 认不出的一律算用户上传，不会标错。
  - 来源、页码、文件名是单独的字段，改写请求不用它们，图片的名称和类型也不变，所以发给模型的文字和 v0.1 一样。
- **取回的副本**（v0.3，`images.ts`、`thread-index.ts`）：取图工具在每张图前写一行“[图片 IMG-xxx 取回的原图｜…]”（英文是 “[Image IMG-xxx fetched original | …]”）。工具输出里紧跟在这行后面、内容又和 IMG-xxx 相同（字节或像素）的图，记成 IMG-xxx 的副本：
  - 不另编号，后面的编号照旧；面板不单列，只在原图那一行标出。
  - 记下它在哪一轮，引擎据此只在那一轮发送它，面板据此列出“最近一轮模型取回”。
  - 只认工具输出里的这行字；用户自己打出同样的字不算。内容对不上的也不算，照常编号。
- **记录行**（v0.8，`notes.ts`，读法 Codex 和 Claude 相同）：模型回复里单独一行、写成 `[//]: # (cam IMG-015 …)` 的 Markdown 链接定义（行首最多 3 个空格，括号里不能再有半角括号）。
  - 只读模型自己的回复：Codex 是 `role: "assistant"` 消息的 `output_text`，Claude 是助手记录的文本块。用户消息和工具结果里同样的字不算，网页内容就塞不进来。
  - 正文以“评价：”或“rated:”开头的是评价，记下所在的轮次，按时间累积；其余是特征行，同一张图只认第一行，以后不改。
  - 和编号一样，引擎和插件服务各自从记录里算，不另存文件。场景是特征行在“｜”（英文是“ | ”）之前的那一段（`sceneOf`）。
- **记录的存放**：
  - `sessions/YYYY/MM/DD`，按创建那天的本地日期分目录；长任务分成好几段。
  - 分叉任务的前半段历史在父任务的记录里，沿记录开头的 `history_base` 跨任务读取。
  - 归档的任务挪到 `archived_sessions`，一样要读；新版 Codex 会把一周没动的记录压缩成 `.jsonl.zst`，用 Node 自带的 zstd 解开。
  - 前面某一段历史找不到了（例如被删掉），就跳过这一段，照常读剩下的，面板上提示。
- **目录遍历**：完整遍历只做一次，之后只重新列出今天和昨天的目录，每分钟再完整遍历一次作为兜底；读某一段找不到时立刻重新查找，最多每 5 秒一次。

## 4. 改写请求（引擎）

- **只改需要改写的任务**：有取消项的，或者用过自动选图的（v0.3：从第一次打开起，历史里可能有取回的副本）。只处理这些任务的 `/responses` 和 `/responses/compact` 请求：解压（zstd、gzip、br）、解析、替换、重新压缩，然后转发。没有要替换的图时，原样转发原始字节。
- **替换规则**（`rewrite.ts`，措辞见 spec 的“占位符”一节）：
  - 取消的图换成一段文字。用户上传的图连同前后两段路径标签一起换掉，占位符里不写本地路径。
  - 本次请求里还有内容相同、仍在发送的图时，用“重复”占位符指向它；否则用普通占位符。
  - 有普通占位符时，在第一张被省略的图所在那一轮的用户消息之前，插入一条开发者消息（“上下文管理说明”）。放在开发者消息里，是因为占位符属于用户内容，模型不把它当成证据。
  - 只要有图被换掉，每张仍在发送、有编号的图前面加一行“已提供”标签（v0.1-25）：重新勾选的图回到原来的位置、夹在占位符中间，没有编号时模型对不上。
  - 文字跟随界面语言（第 7 节）。勾选状态不变时，改写结果逐字节相同，不影响缓存。
  - PDF 页面和网页截图按用户上传处理：占位符里的来源写“用户上传”，Codex 写在图前面的说明不动，模型仍然知道是哪一页。
- **特征行**（v0.8，`rewrite.ts`、`proxy.ts`；措辞和规则见 spec 的“占位符”一节）：
  - 只在本来就改写的请求里做，Codex 的改写时机不变（手动模式要等第一次取消勾选）；子代理、旁聊和 Codex 的后台任务不做（`writesNotes` 看会话记录的 `source`，旁聊没有记录也不做）。
  - 请求里有索引认得的图时，在第一张图所在那一轮的用户消息之前插一条开发者消息“特征行说明”；有“上下文管理说明”时，两条都在，特征行说明在前。
  - 每张发送的图都加“已提供”标签，这一轮的新图也加；新图的标签只在请求末尾，前面的历史不变。
  - 占位符的标题行下面加一行特征和评价（`notesLine`）：特征行加最近 3 条评价和它们的轮次；超长时在上限以内最后一个标点或空格处截断，加“…”（中文特征 30 字、评价 15 字，英文按字符数放宽）。
  - 改写报告多三项，只记数字：`featureAt`（特征行说明插在第几条）、`labeled`（加了几个标签）、`unknown`（索引不认得的图有几张，这一轮取回的副本不算）。关卡 3 用 `unknown` 确认新图在它那一轮的第一个请求里就有编号。
- **自动选图**（v0.3，`proxy.ts`、`rewrite.ts`）：
  - 这一轮是第几轮，按请求头里的 `turn_id` 在索引里查；记录里还没有这一轮时，算最后一轮之后。
  - 之前各轮、没有勾成每轮都发、能替换的图，换成自动版占位符；说明也换成自动版，位置规则不变。工具认不出的图照常发送。
  - “重复”占位符只指向之前各轮仍在发送的图，也就是勾成每轮都发的；“已提供”标签也只加在这些图前面。这一轮的新图和取回的副本都不算：它们是这一轮中途才出现的，算进去的话，前面的占位符会在取图前后变样，缓存就断了。这样取图前后，这一轮前面的历史逐字节不变（有单元测试）。
  - 副本只在取回的那一轮发送；之后换成一句说明（“IMG-xxx 的原图：模型当时用 cam_view_image 取回，只在那一轮提供，现在已省略”）。关掉自动以后也这样，因为面板不单列副本，用户没法取消它。
  - 关着时，传给改写的参数和 v0.2 一样，输出逐字节相同：对照 v0.2 的改写代码，所有勾选组合（中英文、像素相同与否）都比过。
  - v0.6 起新任务默认开着（`selection.ts`）：引擎和插件服务启动时，在勾选目录里写下这个版本第一次运行的时间（`auto-default.json`，只写一次，Codex 和 Claude 各一份）。任务没有自己的开关时，开始时间（会话记录第一条 `session_meta` 的时间，分叉的按来源任务算，`threadStartedAt`）不早于它，就当作开着，从开始时算起；还没有会话记录的算新的。默认值不写进勾选文件，面板里一改就写下来。读勾选的地方都经过它：改写、是否需要改写（所以新任务从一开始就走 HTTP）、面板、取图工具。
- **子代理和旁聊**（v0.7，`proxy.ts`、`selection.ts`、`thread-index.ts`、`children.ts`；Codex 的做法见第 11 节）：
  - 认出来源：`x-codex-turn-metadata` 里除了 `thread_id`、`turn_id`，还读 `forked_from_thread_id`、`parent_thread_id`（没有时看请求头 `x-codex-parent-thread-id`）、`subagent_kind`，一起记进日志。
  - 开关：v0.7 是主任务勾选文件里的 `childrenAuto`；v0.8 起没有开关，一律按自动选图管，0.7 写下的 `childrenAuto` 不再读。
  - 旁聊：请求所属的任务没有会话记录、请求里又有 `forked_from_thread_id`，就是旁聊（`sideChatOrigin`；用户自己分叉的任务有记录，照旧按分叉规则）。用原任务的索引改写：原任务的各轮都算之前的轮次，所以带过来的图都换成自动版占位符，原任务里每轮都发的照发（`sideChatSelection`）。
  - 子代理：会话记录第一条 `session_meta` 里有 `source.subagent.thread_spawn`、没有 `forked_from_id` 的，是不带历史启动的子代理（`spawnParent`），顺着父任务一路找到最上面的主任务（`mainTaskOf`）。子代理自己没有开关时就是自动选图，从子代理开始时算起（`childSelection`）。带历史启动的子代理是分叉，照旧。子代理的第一个请求可能早于它的会话记录，这时按 v0.6 的默认算；它的第一个请求里没有之前各轮的图。
  - 登记：引擎每次看到子代理或旁聊的请求（HTTP 和 WebSocket 都算），就把它记在主任务名下（数据目录 `state/children/<主任务>.json`：类型、来自哪个任务、第一次请求的时间），每个只写一次。旁聊没有会话记录，这是面板知道它的唯一来源。
- **切到 HTTP**：WebSocket 连接上 Codex 只发新增的条目，靠 `previous_response_id` 接上服务端保存的历史，已经发过的图去不掉。所以：
  - 任务一需要改写（有取消项，或者用过自动选图），引擎就对它的 WebSocket 握手回 426，Codex 在这个会话里改走 HTTP，每次都发完整历史；
  - 它已有的 WebSocket 连接，空闲 1.5 秒后由引擎关掉；
  - 取消时这一轮还在 WebSocket 上进行，剩下的请求仍带着原图，引擎记下来，面板提示；
  - 不需要改写的任务照常走 WebSocket。
  - 升级来的连接一进来就挂上错误监听（v0.8 修，0.7.1 里就有这个问题）：Node 在 `upgrade` 事件之后会去掉服务器自己挂在这个连接上的错误监听；引擎回完 426 后，Codex 如果直接重置连接，`ECONNRESET` 没人接，整个引擎进程就退出了（2026-10-19 跑探针时 6 个测试引擎里有 4 个这样退出）。连接上游的过程中客户端走了，连上后直接关掉，不留连接。
- **原样放行**：请求解不开或解析失败、含有 JavaScript 表示不了的大整数、找不到本地记录、改写出错，都原样转发并记下原因，面板上提示。
- **统计**（`request-stats.ts`）：每个任务记最近一次事件和最近一次完整 HTTP 请求：大小、带了哪些图、各多大、替换了哪些。面板用它做发送预览的基准。
- **日志**：只记元数据：方法、路径、状态、字节数、耗时、任务编号、图片编号和内容哈希的前 16 位。不记认证信息，不记对话内容。`--dump-requests` 只用于合成的测试任务，图片只留哈希和长度。
- **改写不影响改图**：改图工具从 Codex 本地的历史取最近的图，不看引擎发出的内容。

## 5. 引擎的生命周期

- **全机一个**：同一个进程在 `127.0.0.1` 和 `::1` 上监听两个端口。默认 17891 提供面板、登记和旧版官方接入，17892 只收已登记线路；自定义引擎端口时，线路端口是下一个。两入口的线路请求不互相代转。`/__cam/health` 报告进程、build（运行目录里 .ts 文件的哈希，换行统一成 LF）、版本，以及 `routingVersion: 1`、`routingPort`。先绑定线路端口，再在旧入口报就绪；两端口都只监听本机。
  - 独立线路端口是升级隔离：旧副本只会拉起旧入口，不会收到新线路的 HTTP 或 WebSocket 请求。仅换路径前缀不够，旧引擎的 WebSocket 仍可能默认向 OpenAI 转发。绑定文件跨引擎重启保留，客户端不需要拿新编号。
- **跟着 Codex**：插件服务启动时确保引擎在运行，之后每隔几秒检查一次，崩了就重新拉起。Codex 全部退出后，引擎自己退出；v0.4 起 Claude Code 也用这个引擎，要等 Codex 和 Claude 的进程都没有了才退出。
- **Windows 的 Job**：插件服务在一个“关闭即结束、不许脱离”的 Job 里，它拉起的引擎随它一起结束，其他会话的插件服务会在几秒内重新拉起。macOS、Linux 上引擎用 `setsid` 脱离进程组。
- **升级时替换**：插件服务发现运行中的引擎版本比自己低，就请旧引擎退役（`/__cam/retire`）：旧引擎立刻停止监听，把正在进行的请求和 WebSocket 这一轮做完再退出，新引擎马上接手端口。版本相同、代码不同时不替换，只有安装命令（`cam install`）强制替换：v0.4 起 Codex 和 Claude 各有一份插件副本，否则两份副本会来回让对方的引擎退役。
- **插件被移除、没先停用**：引擎每 15 秒检查一次，只认明确的迹象：插件缓存目录不在了，或者 `config.toml` 写着 `enabled = false`。连续两次，或者引擎退出前再查一次，就把 Codex 恢复直连。Windows 上引擎通常随插件服务一起被结束，来不及做这一步，所以面板、插件说明和安装说明（INSTALL.md）都写“先停用再移除”，卸载命令负责恢复。

## 6. 面板

- **形态**：侧边面板里的 MCP 应用。工具 `cam_panel` 声明 `thread` 入口（`_meta["openai/ui"].entrypoints`），出现在“新建标签页 → 插件和 MCP”里。页面固定为 `ui://codex-attachment-manager/panel.html`，地址一变就可能白屏（上游 #47512）。
- **不经过模型**：面板的调用不写进聊天记录，不占上下文。每次调用带着面板打开时所在任务的编号（`_meta.threadId`），之后不变。所有面板工具都只给面板用（`visibility: ["app"]`），改动状态的工具拒绝模型调用。
- **工具**：`cam_panel`（面板数据）、`cam_set_selection`（勾选和取消，v0.3 起也开关自动选图；v0.7 的 `childrenAuto` 参数 v0.8 去掉了）、`cam_image`（缩略图和预览）、`cam_setup`（启用和停用）、`cam_bind`（新任务绑定）；v0.3 加了给模型用的 `cam_view_image`，见下。
- **取图工具 `cam_view_image`**（v0.3）：唯一一个模型能调用的工具（没有 app-only 的设置，标着只读）。
  - 只在开了自动选图的任务里工作，否则返回一句“这个任务没有开自动选图……需要时写‘需要 IMG-xxx’”。
  - v0.7：子代理里按它自己的索引取。旁聊没有会话记录，调用的 `_meta["x-codex-turn-metadata"]` 里有 `forked_from_thread_id`，就去原任务的索引取（v0.8 起旁聊里总能取）。
  - 按编号返回原图（不缩小），每张前面一行“[图片 IMG-xxx 取回的原图｜名称｜来源｜轮次｜尺寸]”，不带 Codex 自己的“[Image #N]”：那个编号只在原来那条消息里有意义，GPT-6 Luna 曾把它当成要读的数字。
  - 工具的标题、说明和返回的文字都是给模型看的，所以写在 `rewrite.ts`，跟着界面语言。
- **拿数据**：页面访问不了 `localhost`（上游 #45913），所以一律经 Codex 回调插件服务；图片放在工具结果的 `_meta` 里，用 data URL。PNG 超过要求的尺寸就缩小；缩略图只缓存在内存里，不写磁盘。
- **勾选**：点一下就调用 `cam_set_selection` 保存。保存进行中的点击合并到下一次调用；读数据的过程中开始了保存，这次读到的结果就不用，免得旧状态盖掉刚点的。
- **刷新**：每 3 秒读一次，没有变化就不重画；页面报告自己不可见时降到 15 秒；用户移进、点击、滚动时立刻读一次。
- **发送预览**：以引擎记录的上一次完整请求为基准，按当前勾选估算下一次的大小。
- **“模型需要”提示条**：从模型最近一次回复里认出“需要 IMG-xxx / need IMG-xxx”，也认加粗、引号、reattach、restore 之类的说法；“已上传”“取消勾选”这类描述不算。
- **面板数据里的搜索文字**（v0.8，`panel-state.ts`）：只用于搜索和分组，页面不显示。
  - 每张图多两项：`scene`（特征行的第一段）和 `search`（特征行和全部评价的原文）。
  - 面板数据多一项 `turnTexts`：每一轮里用户说的话、模型的回复（去掉记录行）和工具调用的参数（生图提示词、查看的路径），每段截到 200 字，每轮截到 600 字；客户端加的内容（以标签或 AGENTS.md 标题开头的段落）不算。同一轮的图共用这一份，免得图多时每 3 秒的轮询都很大。Codex 从任务记录里算（`codexTurnTexts`），Claude 从会话记录里算（`claudeTurnTexts`），引擎不做这件事。
- **页面**（v0.8，`panel.html`；样子见 spec 的“界面”一节）：
  - 请求占用卡片默认收起，展开状态只在页面里记。展开后的“最近一轮模型取回”来自索引里最后一轮的副本；子代理和旁聊那一行把 `children` 里各自上次请求少发的加起来。
  - 搜索把编号、名称、来源、场景、`search` 和那一轮的 `turnTexts` 拼成一段小写文字，按空格分词，每个词都要出现；拼好的文字按图缓存，内容或语言变了才重拼。筛选按钮一次只选一个，按钮只在内容、数量或语言变了时重建，轮询和点击都不丢焦点。两行的折叠（0.8.1，`foldChips`）靠量：先全部显示，筛选区高过两行时，从末尾往前隐藏（跳过选中的那个），直到连同“更多 N”放得进两行；只在按钮、选中项、展开状态或面板宽度变了时重量，宽度变化由 `ResizeObserver` 通知。搜索和筛选只在页面里，不写磁盘，换任务时清掉。
  - 缩略图按轮分组（最新一轮在上），格子用 CSS grid 的 `auto-fill`，列数跟着宽度变；每格只在状态变了时重画标记。缩略图按列表顺序排队加载，同时最多 3 张，滚进视野的先加载，只缓存在内存里。
  - 整轮勾选框只管这一轮正在显示、能改的图；预览占满面板（固定定位的一层），点图片、按钮和勾选框以外的地方都退出。
  - 编号按钮（`jumpTo`）：关掉预览；图被搜索或筛选挡住时先清掉；把缩略图滚到列表正中，滚动停下后闪两下，焦点落在缩略图上。
- **自动选图**（v0.3）：
  - 开关在底栏右侧，调 `cam_set_selection`（`auto`）。开着时勾选带 `mode: "auto"`，改的是每轮都发；面板数据里的 `checked` 跟着变成“是否每轮都发”，发送预览、整轮勾选、“由 IMG-xxx 代替”都沿用原来的算法。
  - 切换前，先把还没保存的勾选按原来的模式存完；切换进行中不接受勾选，免得记错地方。
  - 手动模式下不显示“最近一轮模型取回”，提示条照旧是“模型需要”。
  - 预计请求只算每轮都发的图，数字后面加“起”（英文是“+”），悬停说明模型取回的图不算在内。
- **子代理和旁聊**（v0.7，`panel-state.ts`）：面板数据里的 `children` 是引擎登记的子代理和旁聊，按第一次请求的时间排，每个带名字（子代理的 `agent_nickname`，没有时用 `agent_path` 的最后一段）、最近一次完整请求带了几张图，以及和主任务一样算出的上次请求（替换几张、前后大小）。v0.8 起没有 `childrenAuto` 开关，每个也不再带“管不管”。
- **任务名**：读 `<CODEX_HOME>/session_index.jsonl`，同一个任务以最后一行为准。
- **新任务绑定**：在新任务页打开的面板，绑在 Codex 预先准备的任务上，发第一条消息后可能换成另一个任务。
  - 页面记下自己哪些时间段显示在屏幕上，读数据时带给插件服务。
  - 面板所在的任务还没有记录时，插件服务找面板显示期间开始的、用户自己开的任务（不是子代理、分叉或后台任务）。只提供最新的一个，以及和它相差 20 秒以内开始的；只有一个就自动切过去。
  - 绑定记在数据目录的 `bindings/`，只接受面板的调用。
- **外观和高度**：用 Codex 在握手时给的主题和样式变量。26.924 给的 `containerDimensions` 只有 `maxHeight`，页面按它设高度并用 `ui/notifications/size-changed` 报告。每轮标题行必须是定位容器（`position: relative`）：隐藏的勾选框挂到整个页面上时，焦点一落上去整页就会被滚走（v0.1-23）。
- **开发页**：`spike/scripts/panel-dev.ts` 在浏览器里扮演 Codex 的侧边面板，用合成测试图调页面，不用重启 Codex。示例任务里各类来源的图都有。v0.8：`?thread=v08` 是一个角色两个场景的关键帧（特征行、评价、PDF 分镜页、网页、手绘草图、最近一轮取回两张、子代理和旁聊，开着自动选图），`?thread=v08m` 是同一个任务的手动模式；`?demo=details|search|scene|preview|jump` 直接摆出要截图的状态（`&q=` 搜索词，`&id=` 预览哪张）。

## 7. 语言

- 以 `zh` 开头的都算简体中文，其他都算英文。
- **面板**：看 Codex 在 host context 里给的 `locale`，没有就看浏览器语言。
- **引擎和标签页标题**（`language.ts`），按顺序：
  1. 面板报告的语言，只要 Codex 的语言设置还是面板报告时那个；
  2. Codex 的语言设置：桌面版把它写在 `<CODEX_HOME>/computer-use/config.json` 的 `locale` 里（不是公开接口）；
  3. 面板最后一次报告的语言；
  4. 系统语言。
- **标签页标题要重启才换**：标题就是面板工具的 `title`。Codex 把工具定义缓存在应用进程里，最长 30 分钟，收到“工具列表已变”的通知也只记一行日志。
- **文字表**：插件服务和命令行的在 `messages.ts`，面板的在 `panel.html` 里一段 JSON，发给模型的在 `rewrite.ts`。单元测试检查两种语言的条目一一对应。
- **命令行**按系统语言；`CAM_LANG=zh|en` 可以固定语言，测试和开发用。
- **插件清单只能写一种文字**：名称和简介用英文，详细说明先英文、再附一段中文。

## 8. 数据目录

- Windows 是 `%USERPROFILE%\.codex-attachment-manager`，macOS 是 `~/Library/Application Support/codex-attachment-manager`，Linux 按 XDG 是 `~/.local/share/codex-attachment-manager`；`CAM_DATA_DIR` 可以改（测试、开发用）。
- Windows 上不放在 AppData 下：Codex 是微软商店应用，它启动的程序在 AppData 里新建的文件会被转存到应用的私有目录，Codex 外面的命令行和引擎就看不到了。
- 里面有：`selection/`（勾选状态，每个任务一个文件，只记取消的识别键；v0.3 起还记自动选图的开关 `auto`、最近一次切换的时间 `autoAt`、第一次打开的时间 `autoSince` 和每轮都发的图的识别键 `pinned`；v0.6 起还有 `auto-default.json`，新任务默认开着自动选图的起始时间；v0.7 的主任务文件里可能还有子代理和旁聊的开关 `childrenAuto`，v0.8 起不再读）、`bindings/`、`routes/`（v0.9，平台、原服务地址、稳定编号和本机共享密钥）、`state/requests/`（请求统计）、`state/children/`（v0.7，每个主任务的子代理和旁聊）、`cache/pixels/`、`proxy/`（引擎日志）、`plugin-server.jsonl`、`language.json`、`config-backup/`。
- 分叉任务沿用原任务在分叉那一刻的勾选，之后各管各的。v0.3：每轮都发的勾选一样按时间继承；开关在分叉前打开、之后没再切换过才继承；分叉前用过自动选图的，分叉也记下 `autoSince`，以便省略历史里的副本。
- `migrate-data.ts` 在第一次使用时，把旧位置（旧的 AppData 目录和各应用私有目录里的副本）的数据复制过来，用锁文件保证只有一个进程在复制。

## 9. 打包、安装和发布

- **插件市场**：仓库根目录就是插件市场，`.agents/plugins/marketplace.json` 指向 `plugin/`。插件清单在 `plugin/.codex-plugin/plugin.json`，`plugin/.mcp.json` 启动插件服务。
- **启动**：`.mcp.json` 的命令是 `./scripts/launch`，Windows 上 Codex 按 PATHEXT 找到 `launch.cmd`，macOS、Linux 上运行同名的 POSIX 脚本。两者按同样的顺序找 Node：Codex 传来的路径、桌面版资源目录里的 `cua_node`、primary runtime、PATH 上 24 以上的 `node`。用户不用另装 Node。
- **安装**（`cam install`，以及发布附带的 `install.ps1` / `install.sh`）：
  1. 检查和用户自己设置的冲突，备份 `config.toml`；
  2. 先保留已有插件程序文件，再用 Codex 的命令行登记市场、安装目标版本，不先删除可用副本；原生清理可能在 Windows 旧目录仍被进程占用时删掉部分文件，所以安装后补回旧版本，失败时也恢复目标版本的原文件。`cam install` 用 `plugin-cache.ts` 保护；发布脚本做相同保护，并用原生安装返回的版本选择新副本，不再靠目录修改时间猜；
  3. 自检装好的副本：用它自己的启动脚本起服务，问工具列表和面板页面；
  4. 写带标记的块；
  5. 迁移旧的勾选记录，确保引擎在运行。
- **不开终端的安装**：Codex 的插件页面能添加插件市场（`owner/repo`、Git 地址或本地文件夹），装好后在面板里点“启用插件”，由 `cam_setup` 写带标记的块。启用、停用都要重启 Codex 才生效。
- **卸载**：先去掉带标记的块、恢复直连，再卸插件和市场。`uninstall.ps1` / `uninstall.sh` 不需要 Node 和插件文件。
- **Windows PowerShell 5.1**：`irm … | iex` 按 Latin-1 解码，所以两个 `.ps1` 只用 ASCII。
- **发布**：推送 `v<版本>` 标签后，`release.yml` 先在三个平台跑 CI，核对标签和插件版本一致，把标签写进四个脚本，建一个草稿 Release，说明取自 CHANGELOG.md。人工看过再发布。`releases/latest/download/<脚本>` 始终指向最新的发布。

## 10. 测试

- **单元测试**：`spike/src/*.test.ts`，`cd spike && node --test`。
- **冒烟测试**：`plugin-smoke.ts` 用 Codex 自己的命令行装插件、用 app-server 开任务，确认插件服务就绪、引擎启动；`scripts-smoke.ts --upgrade` 真的跑安装、升级和卸载脚本，确认旧运行文件仍在、新副本能启动，`config.toml` 和 `.env` 恢复原样；Windows 还保持旧目录被运行进程占用。CI 在 Windows、macOS、Linux 上跑这两项和全部单元测试。
- **模型自测**（规矩见 AGENTS.md）：`v01-placeholder-selftest.ts` 和 `v01-needs-selftest.ts` 启动自己的引擎（独立的端口和数据目录）和 app-server，用合成图片跑多轮对话，检查模型不收回之前的回答、按编号要图、勾回后看图作答。`CAM_TEST_MODEL`、`CAM_TEST_EFFORT` 换模型，`--lang en` 测英文。测完把建的任务归档；遗留的用 `spike/scripts/archive-test-threads.ts` 归档。
- **自动选图自测**（v0.3，`v03-auto-selftest.ts`）：同样起自己的引擎和 app-server，另把本仓库的插件服务挂成一个单独的 MCP 服务，提供 `cam_view_image`；开关写在测试自己的勾选文件里。测试图角落各藏一个数字，描述时不提：
  - A 组明确要求取图，检查取到、副本不另编号、下一轮被省略；
  - B 组问需要看图的（角落数字、按颜色找图、两个数字相加）和不需要看图的（复述、翻译）；
  - D 组（v0.6）不设开关，检查新任务默认开着；一个问题同时要两张没取过的图，检查都取回、答对；
  - C 组只有一张图，排除上下文的干扰。
  - 2026-10-06 的结果：sol、astra 中英文全部通过；luna 取不取的判断基本都对（英文 C 组漏取一次），读取回的图偶尔读错数字（见第 11 节“模型的差别”）。
  - v0.8：模型上传那一轮就给每张图写了特征行，常把角落的数字也写进去（“右下黑色7”），占位带着它，模型不取图也答对了。所以 B、C 组改成“取了图，或者特征行里有这个数字”都算对；`notes.fromNotes` 记下哪几问是靠特征行答的。D 组上传时要求只说背景和形状，特征行里没有数字，照样检查两张都取回。
- **子代理和旁聊自测**（v0.7，`v07-children-selftest.ts`）：同样的引擎、app-server 和插件服务，另打开 Codex 的 `multi_agent_v2`（`spawn_agent` 的 `fork_turns`）。旁聊照 Codex 的做法开（`thread/fork`，`ephemeral: true`），带一句和 Codex 给旁聊的类似的说明。测试图和自动选图自测一样：
  - S 组：主任务描述两张图后开旁聊，先问文字问题（图都换成占位，不取图），再问角落的数字（从原任务取回，答对）；
  - C 组：子代理第一轮用 `view_image` 看图，主任务用 `followup_task` 给它第二轮，问角落的数字（前一轮的图换成占位，取回，答对）；
  - 每组最后看主任务面板列出的子代理和旁聊。结果见 [v0.7/plan.md](v0.7/plan.md) 第 5 节。v0.8 去掉了开关，也去掉了测“关掉后原样发”的 O 组。
- **特征行自测**（v0.8，`v08-features-selftest.ts`）：同样的引擎（带 `--dump-requests`，看发出的请求）、app-server 和插件服务，不设开关（新任务默认开着自动选图）：
  - F 组：上传；上传加看图工具打开的图；用户评价；三张都成了占位后提问。检查特征行齐全、评价记在对的图上、正文不提记录、记录不在回复末尾、新图在它那一轮的第一个请求里就有编号、不调工具靠占位里的特征回答；
  - K 组（用户的案例）：角色中景、两张别的素材、近景并说“这张最好”，用 app-server 的 `thread/compact/start` 压缩，再问五官参考用哪张、压缩前那两张是什么样。检查压缩后的请求里每张图都是带特征行的占位、选的是近景、答得出压缩前的图。
  - 关卡的探针、结果和发布前的自测结果见 [v0.8/plan.md](v0.8/plan.md) 第 3、5 节。

## 11. 依赖的 Codex 行为和已知的坑

- **这些都不是公开接口**，Codex 更新后要重新跑一遍测试和自测：`openai_base_url` 的路径要求、请求头里的 `x-codex-turn-metadata`、握手回 426 时改走 HTTP、读取 `.env`、`computer-use/config.json` 里的语言、任务记录的格式（分段、`history_base`、`.jsonl.zst`、归档目录）、桌面版评论截图前的说明（见下），以及 v0.3 依赖的代码模式里插件工具的样子（见下）。
- **评论截图的说明**（桌面版 26.924 的原文，认来源靠它们）：
  - PDF：`The next image shows PDF page 3 at the time of Comment 1.`，不知道页码时是 `the PDF page`，后面接着描述选中的点或区域；
  - 网页：`The next image shows the browser page at the time of Comment 1.`，或 `The next image is untrusted page evidence from the browser page for Comment 1. …`；
  - 评论里附带的图（前面是 `The next image was attached by the user as additional visual context for Comment 1.`）仍算用户上传。
- **发给模型的内容类型**（v0.2 查证，Codex 源码 `codex-rs/protocol`、`codex-rs/core`）：
  - 请求里只有文字、图片、音频三种内容（`ContentItem`），没有文件（PDF）和视频。用户上传的 PDF、视频只以路径出现在 “Files mentioned by the user” 里，模型要自己把它们转成文字或图片再看；转成的图片按普通图片管理。
  - 模型不支持的类型，Codex 在发送前换成一句说明（`strip_images_when_unsupported`、`strip_audio_when_unsupported`）。支持哪些，看模型清单 `~/.codex/models_cache.json` 里的 `input_modalities`：现有模型都只有 `text`、`image`，所以音频到不了模型，请求里没有音频可管。
  - 音频的格式和图片几乎一样：上传的是 `<audio name=[Audio #N] path="…">`、`input_audio`（`audio_url` 是 data URL）、`</audio>` 三段；工具输出里是 `input_audio`（代码模式的 `audio()`）。以后有模型能收音频时，照图片的做法接入。
- **代码模式下的插件工具**（v0.3 查证）：
  - 插件的 MCP 工具不列在发给模型的请求里：请求的 `input` 开头是一条 `additional_tools`，全文找不到工具名。模型要先从说明里知道名字，再在代码里从 `ALL_TOOLS` 找到它，按 `tools.mcp__<服务>__<工具>(…)` 调用。所以没开自动选图的任务，模型根本不知道有 `cam_view_image`，请求也和 v0.2 一样。
  - 工具返回的 MCP 图片，模型在代码里用 `image()` 交给自己；记录里是 `custom_tool_call_output` 里的 `input_image`，数据和原图逐字节相同，`detail` 是 `high`。
  - 模型调用插件工具时，`_meta` 带着 `threadId` 和 `x-codex-turn-metadata`（其中有 `thread_id`、`turn_id`）。插件的 `.mcp.json` 设了 `default_tools_approval_mode = "approve"`，不用逐次批准。
  - 同一个任务里第一次取图时，模型常先查一次 `ALL_TOOLS` 确认工具名，多一来回。
- **子代理和旁聊**（v0.7 查证，Codex 0.162；源码 `codex-rs/core/src/responses_metadata.rs`、`turn_metadata.rs`、`mcp_tool_call.rs`）：
  - 旁聊是 app-server 的 `thread/fork`（`ephemeral: true`，这个版本要求同时 `excludeTurns: true`；终端版的 `/side` 也是这样），不写会话记录。它的请求（包括 WebSocket 握手）和模型调用工具的 `_meta` 里，`x-codex-turn-metadata` 的 `thread_id` 是旁聊自己，`forked_from_thread_id` 是原任务。
  - `spawn_agent` 开的子代理有自己的会话记录，`session_meta` 有 `parent_thread_id` 和 `source.subagent.thread_spawn`（`depth`、`agent_path`、`agent_nickname`）。它的请求里 `parent_thread_id` 是父任务，`subagent_kind` 是 `thread_spawn`，`session_id` 是主任务，另有请求头 `x-codex-parent-thread-id`、`x-openai-subagent: collab_spawn`。请求里有父任务时，Codex 不再写 `forked_from_thread_id`，所以带历史的子代理只能从会话记录认出。
  - 子代理的会话记录文件先建好，第一行稍后才写，它的第一个请求可能落在中间（2026-10-13 自测里早了约 40 毫秒）。所以读到空文件时不当结论、不缓存（`spawnParent`、`forkOrigin`、`threadStartedAt`）。
  - 子代理之后的轮次由父任务用 `followup_task` 发起；app-server 拒绝直接给 multi_agent_v2 子代理开新的一轮。归档主任务时，子代理一起归档。
- **上游问题**：#47512（面板地址变化后白屏）、#45913（页面访问不了 `localhost`）。
- **桌面版会在用户消息里附一段 “Files mentioned by the user”**，写着上传文件的完整路径。引擎不改用户消息的文字，靠说明里“不要自己用工具去读取”约束模型；模型偶尔仍会自己打开文件。
- **模型的差别**：小模型在低推理强度下（例如 GPT-6 Luna Light）偶尔会要错图，或者拿到错图时不说“这张里没有”，而是猜一个答案（v0.1-25 的录屏里遇到过）。
  - v0.3 查证：GPT-6 Luna（low）读工具结果里的图，比读用户消息里的图差。同一张图放在消息里问，四次都读对；经 `cam_view_image` 或 Codex 自带的 `view_image` 送来，常把角落的小数字读错（5 读成 3，7 读成 2），有时说看不到数字。把取回的图挪进紧跟着的一条用户消息也没改善，问题在“先调用工具再看图”这个过程，不在图放在哪里。Sol、Astra 没有这个问题。发布说明写明了这一点。
- **桌面版的上下文比自测多**：桌面版每轮还带着电脑操作、浏览器等插件的工具说明（约 1 万 token）。自测为了不让测试模型操作用户的电脑，没开这些插件，所以个别只在桌面版出现的模型行为，自测复现不出来。

## 12. Claude Code 接入（v0.4–v0.9）

方案、关卡和任务见 [v0.4/plan.md](v0.4/plan.md)。做法是把上面的机制逐块移植，这里写对应的做法和平台逼迫的改动。

- **接入**（`hooks/register.js`，Mod）：
  - Claude 桌面启动 Code 会话时传入 `ANTHROPIC_BASE_URL`，不认 settings 文件里的同名设置。所以由 Mod 在会话启动（`session.start`）时切换：读取原地址（没有时用 `https://api.anthropic.com`），确认引擎健康检查声明 `routingVersion >= 1` 和独立的 17892 线路端口，向 17891 的 `POST /__cam/routes` 登记 `{platform: "claude", baseUrl: 原地址}`。登记接口只接受本机 Host、无浏览器 Origin、带 `x-cam-panel: 1` 的请求；不接受引擎自循环地址、含账号密码、片段标记或非 HTTP(S) 的目标。
  - Mod 核对返回地址确实是本机 17892 的对应编号，成功后才用 `$.env.set` 切换本进程的 `ANTHROPIC_BASE_URL`，并把本机地址加进 `NO_PROXY`。原值和插件所写的值都存在会话状态里，结束（`session.end`，`/clear`、`/resume` 除外）时只还原仍等于插件所写值的变量。尽量在首个请求前切好；引擎还在启动时先等几秒，其余在后台等。登记或切换失败时保持或恢复原地址，并提示未接管。
  - 自定义 Anthropic Messages 兼容地址也按同样方式登记；`CLAUDE_CODE_USE_BEDROCK`、Vertex、Foundry 仍不接管。旧引擎不支持独立线路时保持直连，小面板提示；旧 Mod 状态中保存的原地址可用于升级到新线路。
  - 订阅登录和中转认证仍由 Claude Code 提供，引擎只发往该线路的原目标，不把认证头记入日志或线路文件。Claude 身份来自线路的平台绑定；会话与子代理仍靠下面的请求头区分。去掉本机线路前缀后的 `/v1/messages` 才执行 Claude 改写，不要求上游域名是 `api.anthropic.com`。
- **认出会话**：靠请求头 `x-claude-code-session-id`。子代理的请求另带 `x-claude-code-agent-id`，它们有自己的历史，不按主会话改写。
- **找图和编号**（`claude-index.ts`）：
  - 会话记录在 `~/.claude/projects/<项目>/<会话 id>.jsonl`（`CLAUDE_CONFIG_DIR` 可改），只读、增量地读。记录用 `parentUuid` 串成链，从最新一条消息往回走就是当前的对话，撤回、编辑留下的旧分支不算；压缩分界的记录用 `logicalParentUuid` 接上前面的历史。
  - 并行调用工具时，每个结果挂在自己那条调用记录下面，对话从最后一个结果接着往下走。所以调用在链上、链上又没有它结果的那些结果，补回到调用后面。
  - 用户贴的图按“记录 uuid + 序号”识别，工具结果里的图按 `tool:<tool_use_id>#序号` 识别。请求里用户消息的图没有 id，按内容依次对齐。
  - 一轮从用户的一条输入开始：Claude Code 给这条记录标了 `turnPosition`，别的会话发来的消息也算一轮。
- **改写**（`claude-rewrite.ts`、`proxy.ts`）：
  - 只改 `/v1/messages`：用户消息里和工具结果里的图换成占位符，文字和 Codex 版相同。
  - 说明是 `role: "system"` 消息，放在第一张被省略的图所在的那条消息之后；那里已经有系统消息时，并进去。每条含被省略图片的消息后面都跟一条简短说明（`rewrite.ts` 里的 `here`），从后往前插，勾选不变时位置不变。
  - 面板的“上一次请求”只记带工具的主对话请求。桌面版还会在会话里发附带请求（用户离开时的状态摘要、自动模式的安全检查）：照样改写，但不记进这一行。
  - v0.8 的特征行（`claude-index.ts` 从助手记录的文本块里读记录行，`claude-rewrite.ts`、`proxy.ts`）：
    - 会话里有图就改写（`claudeNeedsRewrite`），给每张发送的图加编号标签，占位符里带特征和评价。Claude Code 本来每次都发完整的历史，所以不像 Codex 手动模式那样要等取消勾选。
    - 特征行说明是系统消息，放在第一张图所在那一轮“用户自己的消息”之后（`promptOf`：往前找第一条不含工具结果的用户消息，也就是这一轮的输入，压缩后是摘要那条）；那里已有系统消息时并进去。不放在工具结果后面：Sonnet 5.5 和 Haiku 5.5 会把紧跟工具结果的系统消息当成工具结果里的文字，不信任（Anthropic 关于对话中途系统消息的文档；2026-10-19 实测 Haiku 不照做，还告诉了用户）。
    - 这样改了这一轮里更早的位置，那一轮工具调用前的思考在会核对思考记录的账号上对不上，按“思考记录”的做法去掉一次；之后历史不再变。
    - 从别的会话转来的消息（`<cross-session-message>`），Haiku 不当成用户本人的评价，不记：测试会话里的评价要用户亲手打，或者写明是代发的用户原话。
- **压缩之后**（v0.5，`claude-index.ts`、`claude-rewrite.ts` 的 `addCompacted`、`proxy.ts`；实测见 [v0.5/plan.md](v0.5/plan.md)）：
  - Claude Code 2.1.295 压缩后的请求：第一条是用户消息，内容是整段摘要（等于会话记录里 `isCompactSummary` 那条的文字），接着常有一条它自己的系统消息（例如带 `output_config` 的空消息），然后是压缩前的最后一条回复，再往后是新的一轮；压缩前的图一张都没有。写摘要的那个请求和普通请求一样带着全部历史和图，照常改写。
  - 索引照常跨分界编号，压缩前的图标着 `compacted`，还记下摘要的文字（`summary`）。请求里找到这段摘要，才算压缩后的请求；找不到就不补。
  - 补在摘要文字后面，按编号：要发的（勾着的，自动选图时是勾成每轮都发的）是“已提供”标签加原图（`claudeImageData` 从会话记录读），其余是占位文字（手动和自动各用各的）。说明并进摘要后面的系统消息（没有就插一条）：列出压缩前的全部图；有图没发时前面是完整说明，v0.4 的改写在后面的消息里就只加短说明（`noted`）。全部发出时说明里写明勾回的图回到这里、不会出现在新消息里，以及之前说看不到是因为当时被省略。勾选不变时这两条消息逐字节相同，提示缓存照常命中。
  - 先算好要补哪些，再跑 v0.4 的改写，最后补图；面板统计里 `compacted` 记下补了哪几张（`resent`），面板的“上一次请求”写“补回压缩前的图 N 张”。
  - 面板里压缩前的图照常可勾，标“压缩前”；请求预估把勾着的算作这次加上的。
  - 补图改的是摘要之后的内容，之后产生的思考按上面“思考记录”的做法处理；新账号（模拟）上实测对话不中断。
  - Claude Code 自己的上下文用量（输入框旁的显示）是它的估算，不含补回的图；Anthropic 返回、Claude Code 记进会话记录的用量含。
- **思考记录**（`claude-thinking.ts`、`proxy.ts`）：
  - Anthropic 给每段思考记下它前面的内容（系统提示、工具、消息），之后对不上就失效：2026-08-31 起注册的账号直接拒绝（400，`thinkingRejected`），更早的账号放行。思考可以去掉，只要留下的每一段前面都和它产生时一样。
  - 引擎第一次给一个会话发出改过的历史后，记下每个请求“Claude Code 给的历史”对应“实际发出的内容”（两条哈希链，存在数据目录的 `claude/thinking/<会话 id>.json`，只有哈希）。之后的请求里，一段思考前面要发的内容和它产生时发出的一样，才保留；查不到的算不知道，去掉。比较的是值，不看 JSON 写法、键的顺序和缓存断点，字符串内容等于同样文字的文本块（Claude Code 把末尾的系统消息在它是最后一条时写成带缓存断点的文本块，之后写成字符串）。
  - 发送顺序：还不知道账号校验时，先发带全部思考的改写；被拒后，发去掉对不上的思考的改写，并记下这个会话的账号会校验，之后直接这样发；记录说都对得上却仍被拒，说明记录不全，清空重记，改发不带任何思考的改写（总会被接受）；最后才是原始请求。全部勾回后也照这个顺序：取消期间产生的思考对不上原样的历史。
  - 去掉了思考时，统计里记下去掉了几段，面板照实提示（Anthropic 文档要求代理不要藏起来）；改发原始请求时记下 `fallback`，面板提示这次没能按勾选改写。
  - `CAM_EXPERIMENT_BLOCK_BINDING=error` 让老账号也按新账号的方式校验，只用于实验。
  - 没用 Anthropic 的 `drop_block`（让服务端丢掉对不上的思考，实测它也保留之后新产生的思考）：正式请求要带 beta 请求头，有些思考设置下不能用。用户 2026-10-11 选定由引擎自己去掉。
- **面板**（`proxy.ts`、`panel-web.js`、Mod）：
  - Claude Code 不登记只给应用用的工具，所以用户打不开插件的 MCP 应用；Mod 面板只能画 Claude 自带的元素，也放不进网页。于是由引擎在 `/__cam/panel?session=<id>` 提供 `panel.html`，前面加一段 `panel-web.js` 代替 MCP 应用的宿主：把面板的工具调用转成引擎的本机接口 `/__cam/claude/panel`、`select`、`image`。
  - 页面和接口只接受用本机名字（`localhost`、`127.0.0.1`、`[::1]`）访问、不带其他网站 Origin 的请求；接口还要带 `x-cam-panel` 请求头；页面带严格的 CSP。
  - `/cam` 用桌面版给每个 Code 会话的浏览器工具（`Claude_Browser` 的 `preview_start`），在自带的浏览器里打开页面。这个工具不是公开给插件的接口，调用失败或者没有时，Mod 弹出小面板给链接。Mod 面板里的链接，点开会交给系统浏览器。
  - 小面板上的图片数，在打开时、每轮结束后，以及 `/clear`、`/resume` 之后重新读取。
  - v0.6 自动打开（Mod）：桌面版的浏览器工具能用（终端和 VS Code 里没有）、请求经过引擎时，在进程启动、每轮开始和结束时检查：会话有图（引擎的面板接口）、面板没开（`tabs_context` 里没有引擎来源的标签页）、用户没在这个会话里关过，就 `preview_start` 打开。检查一次只做一个，免得开出两个标签页。
  - 谁关的按时间分：桌面版最早在一轮结束 30 分钟后关会话的自带浏览器（用户看着这个会话时还要更晚），Claude Code 进程不停。这个进程开过的面板在那之前没了，是用户关的，记在插件自己的存储里（`closedPanels`，按会话，留最近 200 个），之后不再自动打开；停了 30 分钟以上，下一轮开始时不在，就重新打开。一轮结束 25 分钟后再看一次，认出停顿里被用户关掉的。`/cam` 清掉这个记录，打开新标签页并关掉旧的；`/clear`、`/resume` 后，开着的面板换到新会话。
  - 页面语言跟着引擎（`CAM_LANG` 或系统语言），不看浏览器。
- **取图工具**：插件服务以 `CAM_HOST=claude` 运行，只给模型 `cam_view_image`。Mod 把调用它的会话 id 补进参数（插件服务可能比 `/clear`、`/resume` 活得久），并在 `classic.PreToolUse` 里放行这一个工具：先让下面的钩子和设置判断，它们拒绝或要求询问时照旧。
- **数据目录**：Claude 会话的勾选在 `claude/selection/`，请求统计在 `claude/requests/`，思考记录的哈希在 `claude/thinking/`，和 Codex 的分开。
- **安装**：
  - 仓库根目录同时是 Claude 插件市场（`.claude-plugin/marketplace.json` 指向仓库根目录），清单是 `.claude-plugin/plugin.json`：同一个 MCP 服务（`plugin/scripts/launch`，`CAM_HOST=claude`），另加 Mod（`hooks/hooks.json`）。
  - 用户运行 `claude plugin marketplace add chipfighter/context-attachment-manager` 和 `claude plugin install codex-attachment-manager@codex-attachment-manager`。装好的插件按版本缓存，代码改了要升版本才会重新安装。
  - Claude 桌面不带 Node。没装 Codex 时，启动脚本用 PATH 上 24 以上的 `node`，找不到就提示安装 Node 24。
- **测试**：单元测试同第 10 节（`claude-*.test.ts`）。Mod 的界面和钩子用 Claude Code 自带的测试工具（`claude plugin test`）测。模型测试用真实的 Claude 桌面订阅会话，按 v0.4/plan.md 的约定用 Haiku 5.5，中英文都测。
- **依赖的 Claude 行为**（都不是公开接口，Claude 更新后要重新验证）：
  - 会话记录的格式：`parentUuid`、`turnPosition`、压缩分界、并行工具结果的挂法；请求头 `x-claude-code-session-id`。v0.5：压缩后的请求以摘要开头，摘要文字和记录里 `isCompactSummary` 那条相同；会话记录只追加，压缩前的图一直在里面。
  - 桌面版启动会话的方式：启动时传入 `ANTHROPIC_BASE_URL`；新会话要到第一条输入才启动进程，所以 `/cam` 在那之前不在输入框的命令列表里。
  - `Claude_Browser` 浏览器工具（v0.6 还用 `tabs_context`、`tabs_close`、`navigate`）；Mod 面板里的链接交给系统浏览器；桌面版在会话里发的附带请求。
  - v0.6：用户不在看这个会话、又 30 分钟没有新的一轮，桌面版就断开会话的自带浏览器、关掉它的标签页，Claude Code 进程照常运行（日志：一轮结束或用户离开会话时 `[WarmLifecycle:preview] Starting idle timeout … 1800s`，用户回来看时重新计时，到时 `Idle timeout reached`）；内存紧张时停掉闲置很久的进程，用到时再启动（`[CliGovernor] pressure evicting`）。时间变了，自动打开分不清谁关的。
  - 思考记录的前缀校验：替换历史里的一张图，之后的思考块就对不上了；2026-08-31 以后注册的账号直接拒绝。比较时不看 JSON 写法和键的顺序；去掉开头或末尾的思考可以，去掉中间的会让后面的失效，把去掉过的放回去，会让它不在期间产生的失效。
