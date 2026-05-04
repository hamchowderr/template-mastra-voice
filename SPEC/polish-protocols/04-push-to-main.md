# Voice Polish 04 — Push to Main

## Step 1: Pre-flight

```bash
cd C:\Users\HamCh\code\template-mastra-voice
git status
```

Verify nothing sensitive is staged.

## Step 2: Commit

```bash
git add .
git commit -m "Configure standard reachability stack

Brings template up to family standard:
- @mastra/editor: non-developer agent iteration via Studio Editor
- @mastra/mcp: MCPServer exposing voiceAssistant agent
- editor storage domain in MastraCompositeStore
- README documents REST/A2A/MCP/Studio/Voice CLI reachability
- AGENTS.md documents reachability conventions and voice specifics
- gemini-live-patch.ts unchanged"
```

## Step 3: Push to main

```bash
git push origin main
```

**No tag.**

## Step 4: Watch CI

```bash
& 'C:\Program Files\GitHub CLI\gh.exe' run watch --repo hamchowderr/template-mastra-voice
```

**Pass criteria**: All four CI jobs green.

Voice-specific failures to watch for:

| Failure | Likely cause | Fix |
|---|---|---|
| `build` red, gemini-live-patch issue | Polish accidentally touched the patch file | Compare patch file against pre-polish version; revert any change |
| `eval` red | The voiceAssistant description change broke an eval assertion | Re-check Polish 02 — the description should not affect tool-call behavior |

If something else fails, write to PROGRESS.md and stop.

## Step 5: Final wrap-up entry in PROGRESS.md

```markdown
## Voice Polish — Standard Reachability + Editor Configuration — COMPLETE

- Status: complete
- All 4 polish steps:
  - 01 Install Packages + Editor Storage: pass
  - 02 Configure MCPServer + MastraEditor: pass
  - 03 Verify + Document Reachability: pass
  - 04 Push to Main: pass
- Repo: https://github.com/hamchowderr/template-mastra-voice
- CI: green on main
- Packages installed: @mastra/editor, @mastra/mcp
- Files changed: package.json, package-lock.json, src/mastra/index.ts, README.md, AGENTS.md, src/mastra/agents/_example.ts (description if added)
- gemini-live-patch.ts: NOT MODIFIED (verified)
- Voice CLI regression check: pass
- No new tag pushed
- Recommended next action: apply same polish to template-mastra-rag
```

Done with voice. Move to template-mastra-rag next.
