# A-site V2 编辑文本权威与状态重提取验证报告

日期：2026-06-14

## 目标

修复“事件正文被用户编辑后，接受命运并成长仍可能沿用旧正文、旧判定或旧状态补丁”的问题。完成后，编辑后正文必须成为接受时唯一正史文本依据，并能驱动 history、canonHistory、attributes、tags、npcs、goals、npcProfiles、下一轮主上下文和导出重导入结果。

## 实装范围

- 运行时版本更新为 `v2-edit-authority-20260614`。
- 增加编辑权威标记：
  - `userEditedStory`
  - `editedAt`
  - `editRevision`
  - `decisionMetadataStale`
  - `storyTextAuthority: "user_edit"`
  - `storyEditMeta`
- 在 `window.__aiLifeSetCurrentYearEvent` setter 侧识别同一事件的正文变更，并同步覆盖兼容旧字段：
  - `story`
  - `storytellerText`
  - `text`
  - `storyText`
  - `resultText`
  - `content`
  - `result`
  - `outcome`
- `buildStoryEventFromLegacy()` 和 `createPendingTextEvent()` 接收编辑事件前先 canonicalize，避免 accepted storyEvent 内仍夹带旧正文。
- `buildExtractionMessages()` 对编辑事件写入明确指令：`acceptedText` 是唯一正史依据，旧掷骰、概率、选项和判定说明只能作为参考 metadata。
- `settleAcceptedStoryEventWithLegacyState()` 对编辑事件不再跳过模型提取，也不复用同事件旧 pending diff。
- `acceptStoryText()` 接受编辑事件时清理同事件旧 pending diff，防止旧正文状态补丁污染新正文。
- UI 在“接受命运并成长”前显示提示：正文已编辑，原判定/概率/掷骰说明可能已过期。
- `index.html` 更新 runtime cache bust：`20260614-v2-edit-authority-a`。

## 本地验证结果

### 1. 编辑后正文权威主回归

命令：

```powershell
node reports\run_edit_authority_regression.js
```

结果：通过。

证据：

- `reports/phase5_full_acceptance_evidence/edit_authority_regression_results.json`
- `reports/phase5_full_acceptance_evidence/edit_authority_export_roundtrip_save.json`
- `output/playwright/edit_authority_regression_pixel5.png`

关键断言：

- `STORYTELLER_DATA` 收到编辑后正文，未收到原始正文。
- `ARCHIVIST` 收到编辑后正文，未收到原始正文。
- `story/storytellerText/text/storyText/resultText` 全部同步为编辑后正文。
- accepted storyEvent 保留 `userEditedStory: true`、`storyTextAuthority: "user_edit"`、`decisionMetadataStale: true`。
- accepted storyEvent 和 legacy payload 中不再保留原始正文。
- `history` 与 `canonHistory` 只写入编辑后正文。
- `精神` 从 50 变为 51。
- 标签写入 `编辑痕迹`。
- NPC 写入 `陆青`。
- `npcProfiles` 写入 `陆青`。
- 目标 `验证编辑影响` 进入 completed。
- 下一轮 STORYTELLER 上下文包含编辑后正文、陆青、编辑痕迹，不包含原始正文。
- save/load 后仍保留编辑后正文和状态变化。
- export/reimport 后仍保留编辑后正文和状态变化。

### 2. 旧普通事件闭环回归

命令：

```powershell
$env:NODE_PATH='C:\Users\15164\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\.pnpm\node_modules'; node reports\run_v2_state_closure_regression.js
```

结果：通过。

证据：

- `reports/phase5_full_acceptance_evidence/v2_state_closure_regression_results.json`
- `output/playwright/v2_state_closure_regression_pixel5.png`

结论：普通事件生成 -> 接受 -> 状态落盘闭环未回归。

### 3. Phase5 runtime 兼容回归

命令：

```powershell
$env:NODE_PATH='C:\Users\15164\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\.pnpm\playwright@1.60.0\node_modules;C:\Users\15164\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\.pnpm\node_modules'; node reports\run_phase5_runtime_compat_test.js
```

结果：通过。

证据：

- `reports/phase5_full_acceptance_evidence/phase5_runtime_compat_results.json`

### 4. 导出存档闭环校验

命令：

```powershell
$env:NODE_PATH='C:\Users\15164\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\.pnpm\playwright@1.60.0\node_modules;C:\Users\15164\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\.pnpm\node_modules'; node reports\validate_v2_closure_export.js --save reports\phase5_full_acceptance_evidence\edit_authority_export_roundtrip_save.json
```

结果：通过。

证据：

- `reports/phase5_full_acceptance_evidence/v2_closure_export_validation_20260614T033710Z.json`

关键校验：

- `hasHistory: true`
- `hasCanonHistory: true`
- `hasDateOrYear: true`
- `hasAge: true`
- `hasNumericEventCount: true`
- `hasAttributes: true`
- `hasTags: true`
- `hasNpcs: true`
- `hasGoals: true`
- `pendingQueuesCleared: true`
- `v2StatePresent: true`
- `baseClosureChanged: true`
- `v2StateChanged: true`

## 当前结论

本地环境中，编辑后正文已经具备后续正史权威；旧原文不会继续作为正史文本、状态提取文本或下一轮主上下文生效。NPC、tags、属性、目标、npcProfiles 均能由编辑后正文触发并落盘。旧普通事件闭环和 Phase5 runtime 兼容测试均通过。

## 发布状态

已发布到 GitHub Pages。

提交：

- `81c869d Fix edited story authority settlement`

线上验证：

- raw GitHub `index.html` 已包含 `20260614-v2-edit-authority-a`。
- raw GitHub `assets/a-site-v2-runtime.js` 已包含 `v2-edit-authority-20260614`。
- Pages `https://maopaotabby.github.io/simulatelife/index.html` 已包含 `20260614-v2-edit-authority-a`。
- Pages `https://maopaotabby.github.io/simulatelife/assets/a-site-v2-runtime.js` 已包含 `v2-edit-authority-20260614`。
- 移动端视口加载 Pages 后，`window.__ASiteV2.version` 和 `document.documentElement.dataset` 均为 `v2-edit-authority-20260614`。
- 移动端视口检测到 `storyEventHasUserEditAuthority`、`canonicalizeUserEditedStoryEvent`、`renderEditedStoryAuthorityWarning` 均已暴露。

证据：

- `reports/phase5_full_acceptance_evidence/pages_mobile_edit_authority_verification_20260614.json`
- 本地截图：`output/playwright/pages_mobile_edit_authority_20260614.png`（未提交到仓库）
