# Voice Polish Spec — Final Verification & Publish

The voice template build is functionally complete (13 phases done, Phase 8 manual mic+speaker test passed end-to-end). This polish pass closes 5 specific gaps before publishing the template to GitHub.

## Read these files in order

1. **`00-README.md`** (this file) — operating instructions and ordering
2. **`01-package-name-fix.md`** — fix `package.json` name bug (currently says `template-mastra-base`)
3. **`02-voice-quality-investigation.md`** — investigate and document the "weak mic, high latency" issue from Phase 8
4. **`03-patch-fragility-doc.md`** — README + AGENTS.md callout about `gemini-live-patch.ts` and how to detect/fix when it breaks
5. **`04-aimock-fixtures-decision.md`** — decide whether to invest in AIMock fixtures or document the limitation
6. **`05-github-publish.md`** — push to GitHub, configure CI, verify CI runs green, publish v0.1.0 tag

## Operating mode for this pass

- **Stop and ask if you find a real bug.** This polish phase validates and documents what's built. New bugs surface before fixing.
- **Update `SPEC/PROGRESS.md`** with a `## Polish Phase N` entry after each step.
- **Don't introduce new dependencies.** No new packages.
- **Don't refactor working code.** Only what these specs explicitly call for.
- **Time budget**: 90–120 minutes total. Step 02 (voice quality) is the biggest unknown — if you're 2x over budget on that step, stop and report.

## Order of operations

```
01 (package.json fix)               → trivial; do first to clear the noise
02 (voice quality investigation)    → biggest unknown; gates publish
03 (patch fragility docs)           → mechanical; can happen any time
04 (aimock decision)                → judgment call; document and move on
05 (GitHub publish)                 → final gate; depends on 01-04 being done
```

Step 01 first because it's a 30-second fix and unblocks anything else.
Step 02 next because it's the biggest risk — voice quality might require code changes.
Steps 03 and 04 can happen in parallel with step 02 if you want, or do them after.
Step 05 is last because it requires everything else to be done.

## Reporting

After all 5 polish steps complete, write a final entry in `PROGRESS.md`:

```
## Voice Polish Complete
- Status: complete | blocked
- All 5 polish steps: <list with pass/fail>
- Voice quality outcome: <fixed | documented as limitation | escalated to owner>
- Outstanding issues: <if any>
- Recommended next action: <ready to publish | fix X first>
```
