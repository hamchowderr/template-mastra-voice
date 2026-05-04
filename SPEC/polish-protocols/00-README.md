# Voice Polish — Standard Reachability + Editor Configuration

Brings the voice template up to the family's standard configuration.

Every template in this family ships with REST, A2A, MCP, Studio, and the Editor. These are not optional. This polish brings `template-mastra-voice` to standard at `https://github.com/hamchowderr/template-mastra-voice`.

## Voice-specific notes

The voice template has a `gemini-live-patch.ts` file in `src/mastra/lib/` that is critical infrastructure. Don't touch it. The polish work happens in `src/mastra/index.ts` and other top-level files only.

The voice agent `voiceAssistant` may already have a description from the original build. If so, it stays. If not, one is added before MCPServer registration.

## Read these files in order

1. **`00-README.md`** (this file)
2. **`01-install-and-storage.md`** — install required packages, configure editor storage
3. **`02-register-editor-and-mcp.md`** — configure MCPServer and MastraEditor
4. **`03-verify-and-document.md`** — verify all four endpoints, document
5. **`04-push-to-main.md`** — commit, push to main, watch CI

## Operating mode

- Stop after each polish step, write to `SPEC/PROGRESS.md`, wait for "continue".
- **No new git tag.** Main update only.
- **Don't refactor working code, especially `gemini-live-patch.ts`.**
- Time budget: 60 minutes total.

## Reporting

After all 5 polish steps, write to `PROGRESS.md`:

```
## Voice Polish — Standard Reachability + Editor Configuration
- Status: complete | blocked
- All 5 polish steps: <list with pass/fail>
- Packages installed: @mastra/editor, @mastra/mcp
- Files changed: src/mastra/index.ts, README.md, AGENTS.md, package.json
- gemini-live-patch.ts: NOT MODIFIED (verified)
- CI run: <status>
- Notes: <anything unexpected>
```
