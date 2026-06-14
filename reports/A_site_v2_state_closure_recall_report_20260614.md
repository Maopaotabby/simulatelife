# A Site V2 State Closure Recall Report - 2026-06-14

## Scope

目标：冻结新增 V2 功能，只修复“接受正文后状态结算闭环”中已经落盘的 V2 状态无法稳定进入下一轮 prompt 的断点。

本轮没有新增事件链、镜头系统、调试面板、UI 美化或新状态模块。

修改文件：

- `assets/a-site-v2-runtime.js`
- `index.html`
- `reports/run_v2_state_closure_regression.js`
- `reports/validate_v2_closure_export.js`

## Old Logic Baseline

旧站基础字段由 `STORYTELLER_DATA` / 接受事件结果驱动，并写回：

- `statChanges -> attributes`
- `newTags / removedTags -> tags`
- `newNPCs / updatedNPCs -> npcs`
- `modifyGoals / achievedGoals -> goals`
- 正文进入 `history / canonHistory`
- 时间、年龄和事件计数由接受流程推进

当前 V2 代码已把旧 DATA schema 转为 `StateDiff.proposedPatches`，再由 `applyConfirmedStateDiff()` 写回。该旧逻辑依据见既有报告：

- `reports/A_site_v2_phase5_legacy_state_settlement_report.md`
- `reports/A_site_v2_state_compat_repair_report_20260614.md`

代码证据：

- 原站主包 `assets/index-B7-XkV0u.js` 的 `STORYTELLER_DATA` 输出合同仍包含 `statChanges / newTags / removedTags / newNPCs / updatedNPCs / modifyGoals / achievedGoals`。
- 原站主包中接受结果摘要组件读取 `statChanges / newTags / removedTags / inspirationGained / achievedGoals`，说明这些字段是基础闭环的显式结果面。
- 原站主包中旧结算函数仍存在：
  - `$ne()` 处理 `modifyGoals / achievedGoals -> goals`
  - `Bne()` 处理 `newTags / removedTags -> tags`
  - `Une()` 处理 `newNPCs / updatedNPCs -> npcs`
  - `Lne()` 构造写入 `history` 的事件文本、判定结果和 `statChanges`
  - `qne()` 处理激励点增量
- V2 runtime 的兼容层把旧 schema 接回 `StateDiff.proposedPatches`：
  - `buildDiffFromAgent()`：`statChanges -> attributes`，`newTags -> tags`，`newNPCs -> npcs`，`modifyGoals / achievedGoals -> goals`
  - `buildStoryEventFromLegacy()`：接受事件对象中的旧字段直接生成自动结算 patch
  - `applyProposedPatch()`：按模块实际写回 `attributes / tags / npcs / goals`
  - `applyConfirmedStateDiff()`：应用 patches、NPC beliefs、时间建议，并写入 `stateDiffHistory / patchHistory`
- V2 runtime 的接受链锚点：
  - `interceptLegacyAccept()`
  - `acceptStoryText()`
  - `runPostAcceptanceExtraction()`
  - `settleAcceptedStoryEventWithLegacyState()`
  - `applyAcceptedEventSettlement()`

历史提交证据：

- `8782930 Restore legacy state settlement on accept`：把普通接受链重新接回旧状态结算。
- `c84049b Repair V2 state patch compatibility`：修复旧 DATA schema、goals patch、NPC belief 兼容。
- `bdab1ed Repair V2 post-accept state extraction`：修复接受后 `STORYTELLER_DATA / ARCHIVIST` 抽取和 text-only fallback。
- `6bae549 Restore V2 state recall in event prompts`：本轮把已落盘 V2 状态召回到下一轮 prompt。

## Current Breakpoints Found

审阅用户 6/14 原始 full 存档：

- `history = 23`
- `canonHistory = 22`
- `eventCount = 23`
- `tags = 11`
- `npcs = 3`
- `npcProfiles = 3`
- `openThreads = 0`
- `loreEntries = 0`
- `sceneMemoryArchive = 0`

最近多次事件进入：

- `TEXT_ACCEPTANCE_ONLY`
- `LEGACY_ACCEPT_CAPTURE` with no patches
- `accepted_event_no_state_diff_fallback`

其中一次真实 `STORYTELLER_DATA` 只产生 `confirmedFacts / npcBeliefs`，没有 `proposedPatches`。旧存档里还出现过 `npc:"Emma"` 但 `npcName:""` 的兼容问题，导致关系认知显示成“未命名认知”。

当前正式代码已经有部分修复：

- `normalizeNpcBelief()` 已兼容 `npc / name / character / person`
- `applyNpcBeliefWithHistory()` 会建立 `npcs / npcProfiles / relationshipStates`
- `buildDiffFromAgent()` 已兼容旧 DATA schema

本轮新发现的剩余断点是：部分 V2 状态已经能落盘，但下一轮主生成 prompt 对 `openThreads / relationshipStates / sceneMemoryArchive / matched loreEntries` 的读取不稳定，尤其任务代理紧凑上下文容易看不到这些状态。

断点按层级拆分：

- 基础闭环层：如果 `STORYTELLER_DATA` 只返回文本或只返回未转 patch 的 facts/beliefs，旧字段不会自然驱动 `attributes / tags / npcs / goals`。
- 兼容解析层：旧存档曾出现 `npc:"Emma"` 但 `npcName:""`，导致关系认知写成空名。
- 接受结算层：`TEXT_ACCEPTANCE_ONLY` 与 `accepted_event_no_state_diff_fallback` 能保住正文，但不能证明状态闭环完成。
- V2 状态层：`npcProfiles / relationshipStates / loreEntries / sceneMemoryArchive` 即使落盘，如果下一轮 prompt 没读到，功能仍然是静态展示。
- 导出验收层：只有导出后的 JSON 和重新导入后的 profile 同时保留状态，才能证明不是内存态成功。

## Fix Applied

新增紧凑状态召回块：

```text
[PERSISTENT_STATE_RECALL]
openThreads:
relationshipStates:
sceneMemoryArchive:
matchedLoreEntries:
```

接入位置：

- `buildContextForAgent().continuityContext`
- `buildImmersionContextBlock()`
- `buildNarrativeMainImmersionBlock()`
- `buildCompactMainTaskImmersionBlock()`
- `buildMainTaskGenerationContextBlock()` 的长期摘要简表

目的：

- 已接受事件产生的开放线索、NPC 关系认知、长期场景归档和匹配 lore 能进入下一轮 `PLANNER / DIRECTOR / DESIGNER / ARBITER / STORYTELLER` 的 prompt。
- 保持紧凑摘要，不恢复超长全文上下文。
- 不把 falseBeliefs / npc_belief 升级成 public / confirmed 客观事实。

`index.html` runtime cache key 更新为：

```text
assets/a-site-v2-runtime.js?v=20260614-v2-state-closure-recall-a
```

Runtime version:

```text
v2-state-closure-recall-20260614
```

## Validation

静态检查：

```text
node --check assets/a-site-v2-runtime.js
node --check reports/run_v2_state_closure_regression.js
git diff --check -- assets/a-site-v2-runtime.js index.html reports/run_v2_state_closure_regression.js
```

本地 HTTP 检查：

```text
http://127.0.0.1:8765/index.html
http://127.0.0.1:8765/assets/a-site-v2-runtime.js?v=20260614-v2-state-closure-recall-a
```

结果：

- index 返回 `200`
- index 指向新 runtime query
- runtime 返回 `200`
- runtime 包含 `v2-state-closure-recall-20260614`
- runtime 包含 `PERSISTENT_STATE_RECALL`

浏览器回归脚本：

```text
node reports/run_v2_state_closure_regression.js
```

证据：

- `reports/phase5_full_acceptance_evidence/v2_state_closure_regression_results.json`
- `output/playwright/v2_state_closure_regression_pixel5.png`

覆盖结果：

- `interceptLegacyAccept -> runPostAcceptanceExtraction -> applyAcceptedEventSettlement`
- stubbed `STORYTELLER_DATA`
- stubbed `ARCHIVIST`
- `history = 1`
- `canonHistory = 1`
- `eventCount >= 1`
- `attributes` 通过旧 `statChanges` 更新，`精神 50 -> 51`
- `tags` 写入 `行政口径建立`
- `npcs` 写入 `Emma / 加菲 / 阿哲 / 柜台办事员`
- `goals` 完成 `拿到校园卡`，新增 `完成学生系统绑定`
- `npcProfiles` 写入上述 NPC
- `relationshipStates` 写入 NPC 认知，且没有“未命名认知”
- `openThreads` 写入 Emma 相关开放线索
- `loreEntries` 写入 `行政办公室校园卡流程`
- `sceneMemoryArchive` 写入行政办公室互动归档
- `shortTermSceneMemory` 写入下一轮局部连续性
- pending queues 清空
- 保存后重新读取 profile，`history / canonHistory / npcProfiles / loreEntries / sceneMemoryArchive` 仍存在
- 下一轮 `STORYTELLER` prompt 能读到 Emma、matched lore、open thread
- 下一轮 `PLANNER` task-compact prompt 能读到 matched lore、open thread、scene archive

旧 6/14 存档兼容读取：

- `reports/phase5_full_acceptance_evidence/v2_old_save_compat_20260614.json`

结果：

- 当前 runtime 可以 normalize 原始旧 full 存档
- `history / canonHistory / eventCount / tags / npcs / npcProfiles / stateDiffHistory` 保留
- prompt 构造包含 `[PERSISTENT_STATE_RECALL]`
- 未对旧存档做自动补正；历史缺失仍需单独存档回填

导出存档验收脚本：

```text
node reports/validate_v2_closure_export.js --save <after-export.json> --baseline <before-export.json> --strict-deltas
```

用途：

- 只读校验导出的 A 网站存档，不修改存档、浏览器存储或调用外部 API
- 检查 `history / canonHistory / date / age / eventCount / attributes / tags / npcs / goals`
- 检查 `npcProfiles / relationshipStates / openThreads / loreEntries / sceneMemoryArchive`
- 检查 pending queues 是否清空，以及是否仍出现“未命名认知”
- 可加载 runtime 构造下一轮 `STORYTELLER / PLANNER` prompt，确认 `[PERSISTENT_STATE_RECALL]` 与已落盘状态进入 prompt

## Publish Verification

提交：

```text
6bae549 Restore V2 state recall in event prompts
211a785 Record V2 state recall Pages verification
3c2e8c2 Add V2 closure export validator
```

推送：

```text
origin/main bc38e6d..6bae549
origin/main 6bae549..211a785
origin/main 211a785..3c2e8c2
```

Raw GitHub 验证：

```text
https://raw.githubusercontent.com/Maopaotabby/simulatelife/main/index.html
https://raw.githubusercontent.com/Maopaotabby/simulatelife/main/assets/a-site-v2-runtime.js
```

结果：

- raw `index.html` 包含 `20260614-v2-state-closure-recall-a`
- raw runtime 包含 `v2-state-closure-recall-20260614`
- raw runtime 包含 `PERSISTENT_STATE_RECALL`

GitHub Pages 验证：

```text
https://maopaotabby.github.io/simulatelife/?cb=<timestamp>
https://maopaotabby.github.io/simulatelife/assets/a-site-v2-runtime.js?v=20260614-v2-state-closure-recall-a&cb=<timestamp>
```

结果：

- Pages `index.html` 返回 `200`
- Pages `index.html` 包含新 runtime query
- Pages runtime 返回 `200`
- Pages runtime 包含 `v2-state-closure-recall-20260614`
- Pages runtime 包含 `PERSISTENT_STATE_RECALL`
- Chrome 中旧标签页原本仍加载旧 query，刷新到 `?v=20260614-v2-state-closure-recall-a` 后已加载新 runtime query

Pages 移动视口回归：

```text
A_SITE_URL=https://maopaotabby.github.io/simulatelife/index.html node reports/run_v2_state_closure_regression.js
```

结果：

- 回归通过
- `reports/phase5_full_acceptance_evidence/v2_state_closure_regression_results.json` 中脚本来源已变为 `https://maopaotabby.github.io/simulatelife/...`
- Pages 包上的 `interceptLegacyAccept -> runPostAcceptanceExtraction -> applyAcceptedEventSettlement -> saveProfile -> getLatestProfile -> next prompt` 仍通过

## Completion Audit

当前远端：

```text
HEAD = origin/main = 0b59b656524c6ca904fd9e4cd1ce0b860a9aa837
```

已由当前证据证明：

- Pages 最新包已加载新 runtime query。
- Pages runtime 包含 `v2-state-closure-recall-20260614`。
- Pages runtime 包含 `[PERSISTENT_STATE_RECALL]`。
- `node --check` 通过：
  - `reports/run_v2_state_closure_regression.js`
  - `reports/validate_v2_closure_export.js`
- stubbed Pages 移动视口闭环通过，证据在 `reports/phase5_full_acceptance_evidence/v2_state_closure_regression_results.json`：
  - `history = 1`
  - `canonHistory = 1`
  - `eventCount = 1`
  - `attributes` 通过旧 `statChanges` 更新，`精神 = 51`
  - `tags` 包含 `行政口径建立`
  - `npcs` 包含 `Emma / 加菲 / 阿哲 / 柜台办事员`
  - `goals` 完成 `拿到校园卡`，新增 `完成学生系统绑定`
  - `npcProfiles` 包含上述 NPC
  - `relationshipStates` 包含上述 NPC 且无“未命名认知”
  - `openThreads / loreEntries / sceneMemoryArchive / shortTermSceneMemory` 均有写入
  - 保存后重读仍保留 `history / canonHistory / npcProfiles / loreEntries / sceneMemoryArchive`
  - 下一轮 `STORYTELLER` prompt 读到 Emma、matched lore、open thread
  - 下一轮 `PLANNER` prompt 读到 matched lore、open thread、scene archive
- 旧 6/14 full 存档可 normalize，prompt 构造包含 `[PERSISTENT_STATE_RECALL]`，且不会再出现“未命名认知”。
- 已提供导出存档只读验收脚本 `reports/validate_v2_closure_export.js`，用于真实事件导出后的 baseline/after 对比。

## Real API Recheck After Archive Fix

追加提交：

```text
edbd184 Fix V2 accepted scene archive settlement
```

本次修复点：

- `assets/a-site-v2-runtime.js`
  - 新增 `buildAcceptedSceneArchivePatch()`
  - 在 `applyConfirmedStateDiff()` 内，将已接受事件的 `shortTermSceneMemory` 派生为同一 `StateDiff` 下的 `sceneMemoryArchive` patch
  - 不强行改 `attributes / tags / npcs / goals`
  - 不新增 V2 模块，只接回既有 `sceneMemoryArchive`
- `index.html`
  - runtime cache key 更新为 `20260614-v2-state-closure-archive-a`
- `reports/run_v2_state_closure_regression.js`
  - 移除 stub 中显式 `sceneMemoryArchive` patch，改为只返回短期记忆，由 runtime 派生归档

发布验证：

```text
HEAD = origin/main = edbd184dc1aab1ddd2d17769f9d7b2f0e3bf650a
Pages URL = https://maopaotabby.github.io/simulatelife/?v=20260614-v2-state-closure-archive-a
runtime = v2-state-closure-archive-20260614
```

Raw 与 Pages 均已验证：

- raw `index.html` 包含 `20260614-v2-state-closure-archive-a`
- raw runtime 包含 `v2-state-closure-archive-20260614`
- Pages `index.html` 包含新 runtime query
- Pages runtime 包含新 runtime version
- Chrome 页面 `data-a-site-v2-version = v2-state-closure-archive-20260614`

真实 API 验证流程：

1. Chrome 加载最新 Pages 包。
2. 恢复林墨档案。
3. 导出 baseline：
   - 本地证据：`reports/phase5_full_acceptance_evidence/real_api_archive_baseline_林墨_full_2026-06-14_v2.json`
   - 不提交公开仓库。
4. 触发真实普通事件：
   - 事件日期：`公历2023年9月5日`
   - 场景：正大广场 / 餐厅赴约
5. 选择行动后完成概率判定：
   - 判定成功
   - 出现并点击 `接受结果并继续`
6. 最终正文生成后点击：
   - `接受命运并成长`
7. 页面显示：
   - `已接受命运并写入正史。`
   - 当前场景更新为 `正大广场四楼餐厅`
8. 导出 after：
   - 本地证据：`reports/phase5_full_acceptance_evidence/real_api_archive_after_save_林墨_full_2026-06-14_v2.json`
   - 不提交公开仓库。

baseline -> after 摘要：

| Field | Baseline | After |
|---|---:|---:|
| date | 公历2023年9月3日 | 公历2023年9月5日 |
| eventCount | 21 | 22 |
| history | 21 | 22 |
| canonHistory | 20 | 21 |
| stateDiffHistory | 19 | 20 |
| patchHistory | 10 | 18 |
| tags | 11 | 11 |
| npcs | 3 | 3 |
| npcProfiles | 3 | 3 |
| relationshipStates | 2 | 2 |
| sceneMemoryArchive | 0 | 1 |
| pendingAcceptedEvents | 0 | 0 |
| pendingStateDiffs | 0 | 0 |

最新 `stateDiffHistory`：

```text
sourceAgent = STORYTELLER_DATA
proposedModules = sceneState / shortTermSceneMemory / npcProfiles / sceneMemoryArchive
```

导出验证：

```text
node reports/validate_v2_closure_export.js --save real_api_archive_after_save --baseline real_api_archive_baseline --url https://maopaotabby.github.io/simulatelife/index.html
```

结果：

- 非严格模式通过
- 证据：`reports/phase5_full_acceptance_evidence/v2_closure_export_validation_20260614T024306Z.json`
- `baseClosureChanged = true`
- `v2StateChanged = true`
- `pendingQueuesCleared = true`
- `noUnnamedRelationships = true`
- `falseBeliefsStayNpcScoped = true`
- runtime prompt 检查通过：
  - `STORYTELLER` prompt 包含 recall block
  - `PLANNER` prompt 包含 recall block
  - matched markers 包含新餐厅场景归档摘要

严格模式结果：

- 证据：`reports/phase5_full_acceptance_evidence/v2_closure_export_validation_20260614T024249Z.json`
- 严格模式未通过的项：
  - `strictTagDelta = false`
  - `strictNpcDelta = false`
- 原因：本轮真实事件没有明确新增 tag，也没有新增 `player.npcs`；这不是本次 archive 修复失败。`sceneState / shortTermSceneMemory / npcProfiles / sceneMemoryArchive` 均已变化。

重新导入验证：

1. 在最新 Chrome Pages 页面点击 `读取`。
2. 导入 after 存档。
3. 页面显示恢复为：
   - `当前时间: 公历2023年9月5日`
   - `当前：普通事件 · 公历2023年9月5日 · 正大广场四楼餐厅 · 林墨已入座，与沈知微开始午餐。`
4. 从导入后的页面再次导出完整存档。
5. 对比 after 与 reimport-export：
   - 证据：`reports/phase5_full_acceptance_evidence/real_api_archive_reimport_compare_20260614.json`
   - `ok = true`
   - `sceneMemoryArchive = 1` 保留
   - `history / canonHistory / stateDiffHistory / patchHistory / date / age / eventCount` 均一致
   - `pendingAcceptedEvents = 0`
   - `pendingStateDiffs = 0`

## Updated Remaining Risk

已由当前证据证明：

- 最新 Pages 包已发布并加载。
- 真实 API 普通事件可以完成：
  - 生成事件
  - 概率判定
  - 正文确认
  - `接受命运并成长`
  - 导出 after 存档
  - 重新导入 after 存档
- 基础闭环已落盘：
  - `history`
  - `canonHistory`
  - `date`
  - `age`
  - `eventCount`
  - `stateDiffHistory`
  - `patchHistory`
- V2 现有长期层已随真实事件变化：
  - `sceneState`
  - `shortTermSceneMemory`
  - `npcProfiles`
  - `sceneMemoryArchive`
- 下一轮 prompt 读取到了持久状态召回块和新场景归档。

仍需保留的风险：

- `tags / player.npcs / goals` 不应在每一轮普通事件中强制变化；它们仍只在旧 schema、模型明确 patch 或事件确实需要时变化。
- 实体手机端是否加载最新 Pages 包仍需用户端确认；桌面 Chrome 与 Pages 资源已确认最新。
- 真实完整存档包含运行日志，未提交公开仓库；本报告只提交摘要与验证 JSON。
