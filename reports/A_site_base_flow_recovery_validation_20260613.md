# A Site Base Flow Recovery Validation - 2026-06-13

## Scope

- Freeze new V2 feature expansion.
- Restore the ordinary A-site event acceptance loop:
  `generated story -> accept fate and grow -> history/canonHistory/date/age/eventCount/attributes/tags/npcs/goals`.
- Keep event-chain behavior explicit only; it must not intercept ordinary accept flow by default.

## Code Changes

### 1. Normalize idempotence guard

`shouldUseLegacyNarrativeAnchor()` no longer treats `birthDateReliability = inferred_legacy` alone as enough reason to overwrite an existing precise `calendarState.currentDate`.

Reason: repeated `normalizePlayer()` calls could previously change a real date such as `2026-06-13` into a January narrative anchor.

### 2. Time suggestion base-date guard

`applyTimeSuggestion()` now uses the raw `player.calendarState.currentDate` as its date-addition base before normalization, and writes explicit `totalDays` when available.

Reason: accepting a state diff with `actualElapsedDaysSuggestion` must advance from the current date, not from a legacy inferred date.

### 3. Story-event timeline source guard

`buildStoryEventFromLegacy()` now uses the current normalized player timeline for ordinary events. Saved-profile cache is only considered when an explicit inline time context exists, and default blank cache is ignored.

Reason: a stale/default runtime cache could previously pollute ordinary story event `eventDate` / `eventYearText`.

### 4. Goals patch compatibility guard

`applyGoalPatchValue()` now accepts the real model shape `value = {summary, status}` for `module = goals` patches:

- `status = active/open/pending/...` adds the summary as a short-term goal only when an empty short-term slot exists.
- `status = completed/done/achieved/...` records the summary as completed.
- Existing short-term goals are not replaced automatically when all three slots are full.

The post-accept extraction prompt now also instructs `STORYTELLER_DATA` to use the old structure `{modifyGoals:{add/remove/achieve/setLongTerm}, achievedGoals:[]}` instead of `{summary,status}` for goals.

Reason: the live Pages run produced a selected accepted `goals` patch with `{summary,status}`, which was recorded in `stateDiffHistory` but did not change `player.goals`.

### 5. Placeholder API verify load guard

`patchFetch()` now intercepts chat-completion requests when the public build placeholder key is being used:

- Blocks only empty/placeholder authorization such as `PUBLIC_BUILD_API_KEY_REMOVED`.
- Applies to both JSON verification and fallback text verification (`Hi`) requests.
- Real API keys continue to pass through.
- Static assets and non-chat-completion requests are not blocked.

Reason: a clean mobile-size Pages load was otherwise issuing network `401` requests to chat-completion endpoints with `Bearer PUBLIC_BUILD_API_KEY_REMOVED`, polluting load verification and slowing the page.

## Validation

### Static

- `node --check assets/a-site-v2-runtime.js`
  - Passed.

### VM: normalize idempotence and storyEvent date

Scenario:

- Player current date: `2026-06-13`.
- Run `normalizePlayer()` twice.
- Create a pending ordinary story event.

Expected and observed:

- First normalized date: `2026-06-13`.
- Second normalized date: `2026-06-13`.
- Pending story event date: `2026-06-13`.

Result: passed.

### VM: full ordinary accept write layer

Scenario:

- Create an ordinary pending event.
- Accept it into `accepted_text_pending_state`.
- Apply deterministic legacy `STORYTELLER_DATA` shape:
  - `statChanges`
  - `newTags`
  - `removedTags`
  - `newNPCs`
  - `updatedNPCs`
  - `modifyGoals`
  - `achievedGoals`
  - `actualElapsedDaysSuggestion.days = 2`

Expected and observed:

- `history`: one accepted entry.
- `canonHistory`: one accepted entry.
- `eventCount`: `1`.
- `calendarState.currentDate`: `2026-06-15`.
- `totalDays`: increased by `2`.
- `attributes`: `STR +2`, `CHA -1`.
- `tags`: old tag removed, new tag added.
- `npcs`: old NPC updated, new NPC added.
- `goals`: old short goal completed, new short goal added.
- pending accepted/diff queues cleared.
- `stateDiffHistory`: one accepted diff.

Result: passed.

### VM: event-chain containment

Scenario A:

- An open `activeNarrativeChain` exists.
- A normal story event is accepted.

Expected and observed:

- Event remains `accepted_text_pending_state`.
- It is queued for settlement.
- It is not added as a `chain_beat`.

Result: passed.

Scenario B:

- An open `activeNarrativeChain` exists.
- Event has explicit `generationMode = chain_continue`.

Expected and observed:

- Event becomes `chain_beat`.
- It is appended to chain transcript.
- It is not queued as ordinary accepted event.

Result: passed.

### VM: goals summary/status patch compatibility

Scenario:

- Apply `module = goals` patch value `{summary:"C", status:"active"}` to a profile with two short-term goals.
- Apply `{summary:"D", status:"active"}` to a profile with three short-term goals.
- Apply `{summary:"午餐预约", status:"completed"}` to a profile with two short-term goals.

Expected and observed:

- Active summary with one empty slot is added to `shortTerm`.
- Active summary does not replace existing goals when all three slots are already full.
- Completed summary is written into `completed`.

Result: passed.

### VM: placeholder API key chat-completion guard

Scenario:

- `/chat/completions` request with `Authorization: Bearer PUBLIC_BUILD_API_KEY_REMOVED`.
- `/chat/completions` request using a `Headers` object with the same placeholder key.
- `/chat/completions` request with `Authorization: Bearer sk-real`.
- Static asset request with placeholder authorization.

Expected and observed:

- Placeholder chat-completion requests are blocked locally.
- Real-key chat-completion requests are not blocked.
- Static asset requests are not blocked.

Result: passed.

### Playwright: simulated mobile Pages load

Page:

- `https://maopaotabby.github.io/simulatelife/index.html?v=20260613-base-flow-closure-b-cleanmobile`

Viewport:

- `390 x 844`

Observed:

- Runtime script: `https://maopaotabby.github.io/simulatelife/assets/a-site-v2-runtime.js?v=20260613-base-flow-closure-b`.
- `data-a-site-v2-schema`: `2.4.0`.
- `data-a-site-v2-version`: `v2-phase5-immersive-simulation-20260607`.
- Homepage rendered with `开启新的人生档案`, `读取外部存档`, and `V2调试`.
- Local screenshot: `output/playwright/a_site_mobile_closure_b_390x844_20260613.png`.

Observed limitation:

- Before the placeholder API key guard, this clean mobile-size load emitted `401` chat-completion requests caused by placeholder API verification.
- The first narrow guard reduced the errors from six to three; the remaining three were fallback text verification (`Hi`) requests.
- The guard was broadened after this observation; `base-flow-closure-d` must be published and rechecked before considering simulated mobile load clean.

### Live GitHub Pages: ordinary event accept/export

Page:

- `https://maopaotabby.github.io/simulatelife/index.html?v=20260613-base-flow-closure-a`

Imported save:

- `save_林墨_full_2026-06-12_v2(1).json`

Flow executed in Chrome:

1. Import save.
2. Select `普通事件`.
3. Click `执行`.
4. Select the first default fate choice.
5. Click `接受结果并继续`.
6. Wait for final text.
7. Click `接受命运并成长`.
8. Export `完整存档`.

Exported save:

- `C:\Users\15164\Downloads\save_林墨_full_2026-06-13_v2.json`

Expected and observed:

- `currentYear`: `公历2023年9月1日` -> `公历2023年9月2日`.
- `calendarState.currentDate`: `2023-09-01` -> `2023-09-02`.
- `calendarState.elapsedDays`: `1` -> `2`.
- `age`: `17岁` -> `17岁`.
- `eventCount`: `19` -> `20`.
- `history`: `19` -> `20`.
- `canonHistory`: `18` -> `19`.
- Latest `history.id`: `event_mqcz3uf6_2skten`.
- Latest `canonHistory.id`: `event_mqcz3uf6_2skten`.
- Latest `stateDiffHistory.status`: `accepted`.
- Latest `stateDiffHistory.sourceAgent`: `STORYTELLER_DATA`.
- Latest `stateDiffHistory.sourceEventId` matches latest history `stateDiffId`.
- `pendingAcceptedEvents`: `0`.
- `pendingStateDiffs`: `0`.
- `attributes`, `tags`, `npcs`, and `goals` were preserved in the exported save.

Observed limitation:

- The real model output included `module = goals`, `operation = update`, `value = {summary:"前往陆家嘴赴沈知微的午餐预约（12:30）", status:"active"}`.
- Because the old `player.goals.shortTerm` already had three entries, the patched compatibility rule will not replace an existing goal automatically.
- No real attributes/tags/npcs change was proposed by that event, so the live export verifies preservation plus stateDiff settlement, while the VM write-layer test verifies direct attribute/tag/npc/goal mutation.

## Remaining External Validation

The local runtime write layer and one real Chrome/GitHub Pages ordinary-event accept/export run are now verified. The following still require evidence before the whole objective can be marked complete:

- Published `base-flow-closure-d` cache-busted Pages package after the placeholder API key load guard.
- Recheck simulated mobile load after `base-flow-closure-d` is live.
- Physical mobile browser cache/load confirmation from the user's phone.
