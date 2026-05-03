# 04 — Build Order

Strict order. Each phase has a verification checkpoint. Don't proceed past a failing checkpoint without flagging in `PROGRESS.md`.

## Phase 0: Fork base via degit

Same approach as RAG template:

1. Move existing SPEC out of the way:
   ```bash
   cd C:\Users\HamCh\code\template-mastra-voice
   move SPEC SPEC.tmp
   ```

2. Run degit (force-overwrite is safe since the only thing here is the SPEC, which we just moved):
   ```bash
   npx degit hamchowderr/template-mastra-base . --force
   ```

3. Restore SPEC:
   ```bash
   rmdir /s /q SPEC
   move SPEC.tmp SPEC
   ```

4. Install:
   ```bash
   npm install
   ```

**Checkpoint**:
- `ls` shows base's structure plus your SPEC folder
- `node_modules/` populated
- `npm run typecheck` passes

## Phase 1: Strip the lead-intake assets

Delete:
- `src/mastra/agents/_example.ts`
- `src/mastra/scorers/_example.scorers.ts`
- `src/mastra/scorers/datasets/_example.json`

Replace `src/mastra/index.ts` with a minimal compiling placeholder (same as RAG Phase 1 — see RAG SPEC if you need a reference). Comment out agent + scorer registrations.

**Checkpoint**: `npm run typecheck` passes.

## Phase 2: Install voice deps

```bash
npm install @mastra/voice-google-gemini-live @mastra/node-audio
```

**Critical**: verify the installed `@mastra/voice-google-gemini-live` version is **greater than 0.11.1**. Version 0.11.1 has a known `this.traced is not a function` bug at connect time.

```bash
npm list @mastra/voice-google-gemini-live
```

If installed version is 0.11.1 or lower, install latest explicitly:
```bash
npm install @mastra/voice-google-gemini-live@latest
```

**Checkpoint**:
- Both packages listed in `package.json`
- Voice package version > 0.11.1

## Phase 3: Extend env loader

1. Update `src/lib/env.ts` per spec — add `GOOGLE_API_KEY` (required), `GEMINI_LIVE_MODEL`, `GEMINI_LIVE_SPEAKER`.
2. Update `.env.example` per spec.
3. Update local `.env` with a real `GOOGLE_API_KEY` from https://aistudio.google.com/app/apikey.

**Checkpoint**:
- `npm run typecheck` passes
- Booting without `GOOGLE_API_KEY` produces a clear Zod error

## Phase 4: Example tool

Write `src/mastra/tools/time-and-math.ts` per spec.

**Checkpoint**: typecheck passes.

## Phase 5: Voice agent + connect smoke test

1. Write `src/mastra/scorers/_example.scorers.ts` per spec (needed by agent imports).
2. Write `src/mastra/agents/_example.ts` per spec.
3. Update `src/mastra/index.ts` to register the agent and scorers.

Then a **connect smoke test** to surface the version-0.11.1 bug or any auth issues immediately. Create a temporary file `scripts/voice-connect-test.ts`:

```typescript
import { mastra } from '../src/mastra';

async function main() {
  const agent = mastra.getAgent('voiceAssistant');
  if (!agent.voice) throw new Error('No voice instance');

  console.log('Connecting...');
  await agent.voice.connect();
  console.log('Connected ✓');
  await agent.voice.disconnect();
  console.log('Disconnected ✓');
}

main().catch((err) => {
  console.error('Connect test failed:', err);
  process.exit(1);
});
```

Run it:
```bash
npx tsx scripts/voice-connect-test.ts
```

**Checkpoint**:
- typecheck passes
- Connect test prints "Connected ✓" and "Disconnected ✓" without error

If you see `this.traced is not a function`, you have version 0.11.1. Upgrade and retry.

If you see auth errors, check `GOOGLE_API_KEY` is valid (test in Google AI Studio first).

After the connect test passes, **delete `scripts/voice-connect-test.ts`** — it was a one-time check.

## Phase 6: Voice CLI script

Write `scripts/voice-cli.ts` per spec. Add `"voice:cli": "tsx scripts/voice-cli.ts"` to `package.json` scripts.

This phase has NO automated checkpoint. The verification happens in Phase 8 (manual mic+speaker test).

**Checkpoint**:
- File exists
- typecheck passes
- npm script registered

## Phase 7: Text-mode dev boot + smoke test

```bash
npm run dev
```

**Checkpoint**:
- Studio loads at localhost:4111
- `voiceAssistant` agent appears
- Text-mode chat in Studio works:
  - Send "What time is it?" → agent calls `getCurrentTime`, returns formatted time
  - Send "What is 47 times 23?" → agent calls `evaluateMath`, returns 1081
  - Send "Hi" → casual response, no tool call
- cURL test:
  ```bash
  curl -X POST http://localhost:4111/api/agents/voiceAssistant/generate \
    -H "Content-Type: application/json" \
    -d '{"messages":[{"role":"user","content":"What time is it?"}]}'
  ```
  Returns 200 with content mentioning current date/time.

This is fully automated up to this point. Phase 8 is the manual checkpoint.

## Phase 8: Manual mic+speaker test (OWNER ONLY)

**This phase requires the owner present at the keyboard with a mic and speakers/headphones.** The agent (you) cannot run this. Stop here and write to `PROGRESS.md`:

```
## Phase 8: Manual mic+speaker test
- Status: blocked-waiting-for-owner
- Required action: owner runs `npm run voice:cli` and reports whether voice conversation works end-to-end
```

When the owner returns with results, document them and proceed.

**What the owner does:**
```bash
npm run voice:cli
```

**Owner reports whether:**
- Connection succeeds (script prints "Connected. Speak now.")
- Owner's spoken input is transcribed to console (`[user] hello`)
- Agent responds in audio AND in console transcript (`[model] hi! how can I help?`)
- Tool call works: owner says "what time is it" → tool call printed to console (`[tool] getCurrentTime(...)`) → audio response includes time
- Math tool works: owner says "what is forty-seven times twenty-three" → tool call → audio response includes "1081" or "one thousand eighty-one"
- Ctrl+C exits cleanly without errors

**If any of those fail**, the owner pastes the error output and the agent debugs.

## Phase 9: Eval gate

1. Write `src/mastra/scorers/datasets/_example.json` per spec.
2. Update `scripts/eval.ts` to handle the new schema (`expectedTool`, `expectedKeywords`).
3. Run:
   ```bash
   npm run eval
   ```

**Checkpoint**:
- Live mode (real env): all 5 cases pass tool-call assertions; scorers ≥ thresholds; exit 0
- AIMock mode: tool/keyword assertions pass; scorers skipped; exit 0

## Phase 10: Docker

Inherits from base. Verify:

```bash
docker build -t template-mastra-voice:test .
docker compose up -d
sleep 15
curl http://localhost:4111/health
docker compose down
```

**Checkpoint**: container builds, starts, /health returns 200.

Note: voice CLI does NOT work in container. Document in README.

## Phase 11: CI workflow

Update `.github/workflows/ci.yml`:

- Add `GOOGLE_API_KEY: stub-key` to all env blocks (typecheck, build, eval) — env loader requires it.
- No new jobs needed; voice CLI is excluded from CI by design.

**Checkpoint**: verified at PR time.

## Phase 12: Documentation

Per spec:
1. Rewrite `README.md` for voice focus
2. Update `AGENTS.md` with voice conventions
3. Write `prompts/build-voice-agent.md`
4. Update `prompts/README.md`

**Checkpoint**: a new dev can run quickstart end-to-end from README.

## Phase 13: Final verification

Run through `05-verification.md` end-to-end. Document any failures in `PROGRESS.md`.
