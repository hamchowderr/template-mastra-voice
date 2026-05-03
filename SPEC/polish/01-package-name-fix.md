# Polish 01 — Package.json Name Fix

Trivial but important. The `package.json` currently says `"name": "template-mastra-base"` because the build forked from base via degit and didn't update the field. Will be confusing when the template is published.

## Steps

1. Open `package.json` in the project root.
2. Change line 2 from:
   ```json
   "name": "template-mastra-base",
   ```
   to:
   ```json
   "name": "template-mastra-voice",
   ```
3. Save.

## Verify

```bash
npm run typecheck
```

**Pass**: still passes.

```bash
cat package.json | grep '"name"'
```

**Pass**: shows `"name": "template-mastra-voice"`.

## What to capture in PROGRESS.md

```
## Polish 01: Package.json name fix
- Status: complete
- File: package.json (one line changed)
- Verification: typecheck still passes
```

That's the whole step. 30 seconds. Move on to Polish 02.
