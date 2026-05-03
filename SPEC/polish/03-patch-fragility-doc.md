# Polish 03 — Patch Fragility Documentation

`src/mastra/lib/gemini-live-patch.ts` is doing heroic work. It bridges three separate library/API mismatches:
1. v1alpha → v1beta endpoint
2. Missing `generationConfig.responseModalities`
3. Deprecated `realtime_input.media_chunks` → `realtime_input.audio`

This patch is **fragile**. Two timing risks:

1. **Library updates and the patch breaks**. When `@mastra/voice-google-gemini-live` maintainers fix v1alpha → v1beta themselves, they'll change internal methods that our patch overrides. The patch will fail at runtime with confusing errors.
2. **Gemini Live API changes again**. The API has clearly moved fast (the patches exist because of API churn). The next breaking change will hit the patch first.

Future-you, contractors, and clients need to know:
- The patch exists
- Why it exists
- How to detect when it breaks
- How to update or remove it

This step adds that documentation in three places.

## 1. Add a section to README.md

Find the existing README (rewritten in Phase 12). Add this section before the "License" section if it exists, otherwise at the bottom:

```markdown
## Voice library patch

This template includes a patch file at `src/mastra/lib/gemini-live-patch.ts` that bridges three incompatibilities between `@mastra/voice-google-gemini-live` and the current Gemini Live API:

1. **API version**: library hardcodes v1alpha; current API requires v1beta
2. **Missing config**: library omits `responseModalities: ['AUDIO']` from setup messages
3. **Deprecated payload**: library uses old `realtime_input.media_chunks` format; current API requires `realtime_input.audio`

The patch is applied automatically when the voice agent is constructed. **No client action is required to make voice work** — this is informational.

### When to update the patch

- **The library is updated** (new version of `@mastra/voice-google-gemini-live`): test if voice still works without the patch. If it does, remove the patch entirely. If it doesn't, the patch may need updating to match new internal method names.
- **Voice mysteriously stops working**: the most likely cause is Gemini Live API changing. Check the [Gemini Live changelog](https://ai.google.dev/gemini-api/docs/live-guide) for recent breaking changes, then update the patch's intercept logic accordingly.
- **You see `TypeError: this.X is not a function`**: the library changed an internal method our patch wraps. Open `gemini-live-patch.ts` and look for the method name in the error.

### Removing the patch

When `@mastra/voice-google-gemini-live` natively supports v1beta + correct payload format:

1. Delete `src/mastra/lib/gemini-live-patch.ts`
2. Remove the import and call from `src/mastra/agents/_example.ts`
3. Run `npm run voice:cli` to verify voice still works
4. Update this README section to remove this whole "Voice library patch" section
```

## 2. Add a section to AGENTS.md

Find the AGENTS.md file. Add to the "things to never do" list (or create one if it doesn't exist):

```markdown
## Voice patch — do not modify lightly

`src/mastra/lib/gemini-live-patch.ts` works around three specific library/API mismatches. If you (the AI coding agent) find yourself wanting to "clean up" or "refactor" this file, STOP.

The patch overrides specific internal methods on `GeminiLiveVoice` instances. The names of those methods (`connect`, `sendEvent`, etc.) are the library's private API and will change when the library updates. Refactoring without testing voice end-to-end will silently break voice for everyone.

If the patch needs changes:
1. Run `npm run voice:cli` BEFORE making changes — confirm current state works
2. Make the change
3. Run `npm run voice:cli` AFTER — confirm voice still works end-to-end
4. Document what you changed and why in PROGRESS.md

Do not modify this file based on type errors alone. The TypeScript types from the library are intentionally bypassed by the patch (using `as unknown as {...}`). If you "fix" type errors, you'll likely break the runtime behavior.
```

## 3. Add a gotcha section to SPEC/06-known-gotchas.md

Find the gotchas file. Add to the "Voice-specific gotchas" section:

```markdown
### The `gemini-live-patch.ts` file is critical infrastructure

The patch is what makes voice work at all. Without it, the voice agent will fail to connect to Gemini Live (the library's hardcoded v1alpha endpoint is no longer supported, and the setup message is missing required fields).

If you're debugging a voice issue and your first instinct is "let me clean up that patch file" — don't. Read the comments in the file first, then run `npm run voice:cli` to see current behavior, then make the smallest possible change.

The patch will eventually become unnecessary when the library natively supports the current API. Until then, treat it as load-bearing.
```

## Verify

After making the three doc updates:

```bash
# README still renders cleanly
cat README.md | head -50

# AGENTS.md has the new section
grep -A 10 "Voice patch" AGENTS.md

# Gotchas file has the new section
grep -A 5 "gemini-live-patch.ts is critical" SPEC/06-known-gotchas.md
```

**Pass**: all three sections present and readable.

## What to capture in PROGRESS.md

```
## Polish 03: Patch Fragility Documentation
- Status: complete
- Files updated: README.md, AGENTS.md, SPEC/06-known-gotchas.md
- Verification: sections grep cleanly
- Notes: patch existence is now documented in three places at appropriate levels of detail
```
