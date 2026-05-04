# Voice Polish 01 — Install Required Packages + Configure Editor Storage

## Step 1: Install packages

Both packages are required.

```bash
cd C:\Users\HamCh\code\template-mastra-voice
npm install @mastra/editor @mastra/mcp
```

Verify:
```bash
npm list @mastra/editor @mastra/mcp
```

**Pass**: both packages listed at version >= 1.24.0.

## Step 2: Configure editor storage domain

Open `src/mastra/index.ts`. Find the existing `MastraCompositeStore` block. Voice has the same structure as base:

```typescript
storage: new MastraCompositeStore({
  id: 'composite-storage',
  default: new PostgresStore({ id: 'mastra-storage', connectionString: env.SUPABASE_DB_URL }),
  domains: {
    observability: await new DuckDBStore().getStore('observability'),
  },
}),
```

Add the `editor` domain:

```typescript
storage: new MastraCompositeStore({
  id: 'composite-storage',
  default: new PostgresStore({ id: 'mastra-storage', connectionString: env.SUPABASE_DB_URL }),
  domains: {
    observability: await new DuckDBStore().getStore('observability'),
    editor: new PostgresStore({ id: 'mastra-editor-storage', connectionString: env.SUPABASE_DB_URL }),
  },
}),
```

**Pass**: typecheck still passes.

```bash
npm run typecheck
```

## What to capture in PROGRESS.md

```
## Voice Polish 01: Install Packages + Editor Storage
- Status: complete
- Installed: @mastra/editor v<version>, @mastra/mcp v<version>
- File changed: src/mastra/index.ts (added editor domain)
- Verification: typecheck passes
```

Move on to Polish 02.
