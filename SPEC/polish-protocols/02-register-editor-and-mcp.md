# Voice Polish 02 — Configure MCPServer + MastraEditor

## Step 1: Verify the voice agent has a description

Open `src/mastra/agents/_example.ts`. Look for the `voiceAssistant` agent constructor. Check whether it has a `description` property.

If yes, note the existing description text in PROGRESS.md.

If no, add one:

```typescript
description: 'Real-time voice assistant powered by Gemini Live STS. Handles tool-calling for time queries and math evaluation. Reference implementation for voice agents in the family.'
```

This is a hard requirement — MCPServer fails to start without it.

## Step 2: Imports

At the top of `src/mastra/index.ts`, add:

```typescript
import { MastraEditor } from '@mastra/editor';
import { MCPServer } from '@mastra/mcp';
```

## Step 3: Construct the MCPServer

Before the `Mastra` constructor block:

```typescript
const mcpServer = new MCPServer({
  id: 'voice-mcp',
  name: 'template-mastra-voice',
  version: '0.1.0',
  description: 'MCP server exposing template-mastra-voice agents as tools',
  agents: { voiceAssistant: voiceAssistantAgent },
});
```

## Step 4: Configure the Mastra constructor

Voice currently has:

```typescript
export const mastra = new Mastra({
  agents: { voiceAssistant: voiceAssistantAgent },
  scorers: { ... },
  storage: new MastraCompositeStore({ ... }),
  logger: new PinoLogger({ ... }),
  observability: new Observability({ ... }),
});
```

Required state:

```typescript
export const mastra = new Mastra({
  agents: { voiceAssistant: voiceAssistantAgent },
  scorers: { ... },
  mcpServers: { voiceMcp: mcpServer },
  storage: new MastraCompositeStore({ ... }),
  logger: new PinoLogger({ ... }),
  observability: new Observability({ ... }),
  editor: new MastraEditor(),
});
```

## Step 5: Verify typecheck

```bash
npm run typecheck
```

**Pass**: zero errors.

## Step 6: Verify dev boot

```bash
npm run dev
```

**Pass**:
- Studio loads at `http://localhost:4111`
- No errors in console
- The voiceAssistant agent appears
- Editor tab visible on the agent

**Caveat**: Voice may take a few seconds to load the gemini-live patch. That's normal. If you see voice patch errors instead of editor errors, the polish hasn't broken voice — but stop and check the patch is still being applied correctly.

## What to capture in PROGRESS.md

```
## Voice Polish 02: Configure MCPServer + MastraEditor
- Status: complete
- voiceAssistant description: <existing text | added: ...>
- Imports added: MastraEditor, MCPServer
- Configuration: MCPServer instance + mcpServers and editor fields in Mastra constructor
- Verification: typecheck passes; dev boots; Editor tab visible; voice patch still loads
- Notes: <anything unexpected>
```

Move on to Polish 03.
