# Polish 04 — AIMock Fixtures Decision

PROGRESS.md from the original build noted:
> Cases 2-5 errored with "No fixture matched" — AIMock has no fixtures for Google Gemini or tool-call flows.

The eval gate "passes" under AIMock for case 1 only (no tool call). Cases 2-5 (which involve tool calls) error out. The voice template's CI is therefore providing weaker validation than CI for base or other templates.

This step decides what to do about it.

## Two paths

### Path A: Document the limitation, ship as-is

Reasoning:
- AIMock fixtures for tool-call flows are non-trivial (must match Anthropic's tool-call response format, including IDs and arguments)
- Live eval still catches regressions during local development and pre-publish testing
- Voice quality (the headline feature) can't be tested in CI anyway — CI is already a partial signal for this template
- Effort: ~5 minutes (just documentation)

### Path B: Build fixtures for cases 2-5

Reasoning:
- CI becomes a real signal — every PR validates the agent's tool-calling logic
- Future contractors get faster feedback on regressions
- Once written, the fixtures don't need maintenance unless the agent's tool definitions change
- Effort: ~45-60 minutes (write 4 fixtures, test each, debug AIMock matching quirks)

## Recommendation: Path A

Voice template CI is already constrained (can't test mic+speaker, can't test live Gemini Live). Adding AIMock fixtures for tool calls gets you ~30% more CI coverage at a real cost in maintenance overhead. Better to honestly document the limitation than build infrastructure that creates an illusion of coverage.

If the owner disagrees and wants Path B, do that instead.

## Owner check before proceeding

This is a judgment call. Before doing either path, ask:

> "AIMock CI for the voice template only validates 1 of 5 cases (the no-tool-call case). The other 4 cases need fixtures that match Anthropic's tool-call response format. Two options:
> 1. Document the limitation, accept that AIMock CI is weaker for this template (~5 min)
> 2. Write the fixtures, get full CI coverage (~45-60 min)
>
> Which do you want?"

Wait for owner answer before proceeding. Default if unanswered: Path A.

## Path A implementation (default)

### 1. Update README.md

Add a "CI eval coverage" subsection under the existing CI section (or create one):

```markdown
### CI eval coverage

This template's CI eval gate runs against AIMock with text-mode assertions only. AIMock cannot intercept WebSocket-based voice calls (Gemini Live), and our agent uses Anthropic's tool-call format which AIMock would need fixtures for.

What CI validates:
- Typecheck: full
- Build: full
- AIMock eval: partial — case 1 only (no-tool-call cases). Tool-calling cases (2-4) and the polling case (5) require fixtures that aren't included.
- Docker: full

For full eval coverage, run locally with real API keys:

```bash
npm run eval
```

This burns ~$0.05 in API costs but validates all 5 cases against the live agent.
```

### 2. Update SPEC/06-known-gotchas.md

Add to the voice-specific gotchas:

```markdown
### CI eval is partial for tool-calling cases

AIMock can't realistically mock Anthropic tool-call responses without per-case fixtures we haven't built. Cases involving tool calls error out under AIMock with "No fixture matched."

This is by design for v1. Live eval (`npm run eval` with real keys) catches regressions during development. CI catches typecheck, build, and basic agent invocation regressions.

If a client needs full CI eval coverage, they can build AIMock fixtures matching Anthropic's tool-call response format. The fixture format is documented in `@copilotkit/aimock` docs.
```

### 3. Update PROGRESS.md note

The original PROGRESS.md flagged this as an issue. Add a follow-up note that the issue has been triaged and accepted as a v1 limitation:

```markdown
## Polish 04 follow-up: AIMock partial coverage accepted

Original concern: only 1/5 eval cases pass under AIMock.
Decision: accepted as v1 limitation. Documented in README and 06-known-gotchas. Live eval (with real keys) covers all 5 cases.
```

## Path B implementation (if owner picks fixtures)

### 1. Inspect AIMock's fixture format

```bash
ls fixtures/
cat fixtures/*.json | head -100
```

Look at the fixture from base or any working fixture as a reference.

### 2. Identify what each case needs

For each of cases 2-5 in `src/mastra/scorers/datasets/_example.json`, the agent will:
- Receive the user message
- Call its model (Anthropic, via AIMock)
- The model returns either a tool-call or a text response
- The agent executes the tool, then calls the model again with the tool result
- The model returns the final text response

So each case needs at minimum 2 fixtures:
- Initial response (tool-call message)
- Final response (text after tool result)

### 3. Write the fixtures

For each case (2, 3, 4, 5), create entries in `fixtures/voice-tool-calls.json` (or wherever fixtures are stored) that match:
- The user message
- An Anthropic-format response with the appropriate `tool_use` block
- A second response with the appropriate text

The exact format depends on AIMock's matching logic — check existing fixtures.

### 4. Run AIMock + eval

```bash
npx @copilotkit/aimock --port 4010 -c aimock.json
USE_AIMOCK=true npm run eval
```

**Pass**: 5/5 cases pass under AIMock.

### 5. Document fixtures in README

Update README to reflect that all 5 cases pass under AIMock CI.

## What to capture in PROGRESS.md

```
## Polish 04: AIMock Fixtures Decision
- Status: complete
- Path chosen: A (documented as limitation) | B (fixtures written)
- Time spent: <minutes>
- CI eval coverage: 1/5 cases (Path A) | 5/5 cases (Path B)
- Files updated: README.md, SPEC/06-known-gotchas.md, [+ fixtures/*.json if Path B]
```

## Stop after this step

Wait for owner approval before Polish 05.
