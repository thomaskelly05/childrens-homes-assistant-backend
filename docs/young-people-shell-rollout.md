# Young People Shell Modular Rollout

This document explains how to test and roll out the modular Young People Care Hub safely.

## Modes

### Default mode

```text
/young-people-shell
```

This keeps the current production behaviour.

### Modular test mode

```text
/young-people-shell?modular_shell=1
```

This activates the modular shell and prevents the legacy shell from loading.

### Modular test mode with automatic smoke checks

```text
/young-people-shell?modular_shell=1&smoke_shell=1
```

Expected console messages:

```text
[young-people-shell/readiness] ready
[young-people-shell/smoke-test] passed
```

Detailed smoke test output is available in the browser console at:

```js
window.__INDICARE_YOUNG_PEOPLE_SHELL_SMOKE_TEST__
```

### Force legacy fallback

```text
/young-people-shell?legacy_shell=1
```

This forces the existing production shell, even if modular mode has been enabled elsewhere.

## Local testing flags

Enable modular mode persistently in a browser:

```js
localStorage.setItem("indicare.modularYoungPeopleShell", "true")
```

Enable automatic smoke testing persistently:

```js
localStorage.setItem("indicare.smokeYoungPeopleShell", "true")
```

Clear local testing flags:

```js
localStorage.removeItem("indicare.modularYoungPeopleShell")
localStorage.removeItem("indicare.smokeYoungPeopleShell")
```

## Modular shell files

```text
frontend/js/young-people-shell/api.js
frontend/js/young-people-shell/assistant.js
frontend/js/young-people-shell/boot.js
frontend/js/young-people-shell/composer.js
frontend/js/young-people-shell/contract.js
frontend/js/young-people-shell/data-loader.js
frontend/js/young-people-shell/legacy-loader.js
frontend/js/young-people-shell/modular-entry.js
frontend/js/young-people-shell/readiness.js
frontend/js/young-people-shell/smoke-test.js
frontend/js/young-people-shell/state.js
frontend/js/young-people-shell/ui.js
```

## Readiness checks

Readiness verifies:

- required DOM elements exist
- modular ownership flag is set
- selector exists and has options
- selected young person state exists
- tabs are present
- assistant and composer surfaces exist
- boot, assistant and composer handles are exposed

## Smoke checks

Smoke testing verifies:

- readiness passes
- modular active flag is present
- legacy shell is not loaded in modular mode
- selector is ready
- a young person is selected
- daily tab can load
- assistant tab can open
- assistant module handle exists
- composer module handle exists
- composer opens
- composer renders fields
- composer closes

## Go/no-go checklist

Before making modular mode the only production path, verify:

1. `/young-people-shell?modular_shell=1&smoke_shell=1` reports readiness ready and smoke passed.
2. Selector loads the expected young people.
3. Daily, health, education, family, incidents and medication tabs behave correctly.
4. Assistant panel opens and can send a message.
5. Composer opens, renders fields, saves a draft and submits.
6. `/young-people-shell?legacy_shell=1` still provides fallback behaviour during rollout.

## Cutover note

Keep the fallback loader until modular mode has passed the smoke checks and manual user-flow checks in the target environment. After that, the page can be simplified so modular mode is the only path.
