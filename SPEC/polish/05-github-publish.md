# Polish 05 — GitHub Publish & CI Verification

Push the voice template to GitHub. Configure secrets. Watch CI run green. Tag v0.1.0.

This is the final gate. After this, the voice template is provisioning-ready — anyone can run `npx degit hamchowderr/template-mastra-voice my-project` and have a working voice agent project.

## Prerequisites

- Polish 01–04 complete
- `gh` CLI installed and authenticated (`gh auth status`)
- A real `CI_APP_SECRET` value generated and ready
- The owner's GitHub username/org (`hamchowderr` based on base)

## Steps

### 1. Pre-flight: secrets check

Before pushing anything, verify nothing sensitive is staged:

```bash
cd C:\Users\HamCh\code\template-mastra-voice
git status
```

**Pass criteria:**
- `.env` NOT in tracked files
- `.env.bak` (if it exists) NOT in tracked files
- No file containing real API keys, Supabase service role keys, or Google API keys

If anything sensitive shows up:
1. Verify `.gitignore` includes `.env`, `.env.bak`, `node_modules/`, `.mastra/`, `mastra.duckdb*`
2. Run `git rm --cached <file>` for any sensitive file already tracked
3. Re-verify with `git status`

### 2. Initialize git if needed

```bash
git log --oneline | head -3
```

If "fatal: not a git repository" or no commits:

```bash
git init
git add .
git commit -m "Initial commit: template-mastra-voice from spec build + polish"
```

If git is already initialized:

```bash
git status
git add .
git commit -m "Polish complete: ready for v0.1.0 publish"
```

### 3. Create the GitHub repo

Confirm the org/username with the owner if you don't already know it. Default: `hamchowderr` (matches base).

```bash
gh repo create hamchowderr/template-mastra-voice \
  --public \
  --source=. \
  --description "Voice agent Mastra template — Gemini Live STS, mic+speaker CLI, forks from template-mastra-base" \
  --push
```

**Pass criteria:**
- Command exits 0
- Repo URL printed
- `git remote -v` shows the new origin

### 4. Configure CI_APP_SECRET secret

```bash
openssl rand -hex 32
```

Copy the output. Then:

```bash
gh secret set CI_APP_SECRET --repo hamchowderr/template-mastra-voice
# Paste the value when prompted
```

**Pass criteria:**
- `gh secret list --repo hamchowderr/template-mastra-voice` shows `CI_APP_SECRET`

### 5. Trigger CI

The push from step 3 should have triggered CI already. Check:

```bash
gh run list --repo hamchowderr/template-mastra-voice --limit 3
```

If no run appeared:

```bash
gh workflow run ci.yml --repo hamchowderr/template-mastra-voice
```

### 6. Watch CI complete

```bash
gh run watch --repo hamchowderr/template-mastra-voice
```

**Pass criteria:**
- All four jobs report ✓:
  - `typecheck` ✓
  - `build` ✓
  - `eval` ✓ (with the AIMock partial-coverage caveat from Polish 04)
  - `docker` ✓ (only on push to main)
- Total CI duration: 5-10 minutes for a first run

### 7. Investigate any failures

Common voice-template-specific failures and fixes:

| Failure | Likely cause | Fix |
|---|---|---|
| `build` red, missing `GOOGLE_API_KEY` | env loader requires it but CI workflow doesn't stub it | Add `GOOGLE_API_KEY: stub-key` to all CI env blocks |
| `build` red, native build error for `@mastra/node-speaker` | Native compilation fails in CI runner | Add `apt-get install -y libasound2-dev python3 g++` step before `npm ci` (matches Dockerfile pattern) |
| `eval` red, "No fixture matched" for case 1 | AIMock fixture mismatch | Verify `fixtures/` is mounted correctly and `aimock.json` points at it |
| `docker` red, `gemini-live-patch.ts` not in build output | TypeScript doesn't include the patch in `mastra build` output | Verify the patch is imported by the agent (it should auto-include) |

If any failure isn't on this list, document it in PROGRESS.md and stop. Don't push band-aid commits to make CI green.

### 8. Tag v0.1.0

Once CI is green:

```bash
git tag -a v0.1.0 -m "v0.1.0 — voice template, Gemini Live STS, polish complete"
git push origin v0.1.0
```

This creates a stable reference. Future client projects can pin to v0.1.0 via:
```bash
npx degit hamchowderr/template-mastra-voice#v0.1.0 my-project
```

### 9. Optional: provisioning smoke test

Same as base's polish 03. Verify the template is genuinely template-able:

```bash
mkdir C:\Users\HamCh\Downloads\voice-test
cd C:\Users\HamCh\Downloads\voice-test
npx degit hamchowderr/template-mastra-voice voice-client-test
cd voice-client-test
cp ../../code/template-mastra-voice/.env .env
# Edit APP_SECRET to a fresh one
npm install
npm run typecheck
npm run dev
```

**Pass criteria:**
- All commands succeed
- Studio loads at localhost:4111
- `voiceAssistant` agent visible

Clean up:
```bash
cd ..
rm -rf voice-client-test
```

This step is optional but recommended — it's the only test that verifies the GitHub repo actually works as a template.

## What to capture in PROGRESS.md

```
## Polish 05: GitHub Publish & CI
- Status: complete | blocked
- Repo URL: https://github.com/hamchowderr/template-mastra-voice
- CI runs:
  - typecheck: ✓ <duration>
  - build: ✓ <duration>
  - eval: ✓ <duration> (1/5 cases under AIMock per Polish 04)
  - docker: ✓ <duration>
- Tag: v0.1.0 pushed
- Provisioning smoke test: pass | skipped | fail
- Notes: <CI quirks, anything unexpected>
```

## Final wrap-up entry in PROGRESS.md

After all 5 polish steps:

```markdown
## Voice Polish Complete

- Status: complete
- All 5 polish steps:
  - 01 Package.json name fix: pass
  - 02 Voice quality investigation: <fixed | documented as limitation>
  - 03 Patch fragility docs: pass
  - 04 AIMock fixtures: <Path A documented | Path B fixtures written>
  - 05 GitHub publish: pass — repo at https://github.com/hamchowderr/template-mastra-voice, tag v0.1.0
- Outstanding issues: <if any>
- Recommended next action: ready to proceed with NCA template
```

## You're done

After this, the voice template is published, polished, and provisioning-ready. The owner can move on to the NCA Toolkit template (which has flagged spec corrections — see conversation transcript or wait for the owner to update the NCA spec).
