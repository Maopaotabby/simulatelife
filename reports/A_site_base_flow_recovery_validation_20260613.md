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

## Remaining External Validation

The local runtime write layer is now verified. The following still require live browser/API or user-device evidence before the whole objective can be marked complete:

- A real model-generated ordinary event on GitHub Pages.
- A real click on `接受命运并成长` with the user's configured API/session.
- A real exported save after that click.
- Physical mobile browser cache/load confirmation from the user's phone.

