# Files Bulk Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a delete-mode bulk action in Files view, remove per-row edit/delete icons, and keep row interactions (name + emoji) opening/toggling entries, with clearer spacing around the new file/folder input row.

**Architecture:** Keep all behavior inside `FilesView` UI state. Bulk delete uses existing backend DELETE endpoint (recursive) with an explicit confirm. No backend changes.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind, Vitest, React Testing Library

---

## File Structure

- Modify: `client/src/views/FilesView.tsx`
- Create: `client/src/views/__tests__/FilesView.test.tsx`
- Create: `client/vitest.config.ts`
- Create: `client/src/test/setup.ts`
- Modify: `client/package.json`

---

### Task 1: Add Frontend Test Harness

**Files:**
- Modify: `client/package.json`
- Create: `client/vitest.config.ts`
- Create: `client/src/test/setup.ts`

- [ ] **Step 1: Add test dependencies and script**

Update `client/package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.2",
    "@testing-library/react": "^14.2.2",
    "jsdom": "^24.0.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Add Vitest config**

Create `client/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    globals: true,
  },
});
```

- [ ] **Step 3: Add test setup**

Create `client/src/test/setup.ts`:

```ts
import "@testing-library/jest-dom";
```

- [ ] **Step 4: Install dependencies**

Run:

```bash
cd client && npm install
```

Expected: npm completes without errors.

- [ ] **Step 5: Commit**

```bash
git add client/package.json client/vitest.config.ts client/src/test/setup.ts
git commit -m "test: add vitest harness for client"
```

---

### Task 2: Write Failing UI Tests (Delete Mode + Row Interactions)

**Files:**
- Create: `client/src/views/__tests__/FilesView.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `client/src/views/__tests__/FilesView.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FilesView } from "../FilesView";

function mockFetchSequence(responses: Array<{ ok: boolean; entries?: any[]; content?: string }>) {
  const fetchMock = vi.fn();
  responses.forEach((r) => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => r,
    });
  });
  (globalThis as any).fetch = fetchMock;
  return fetchMock;
}

describe("FilesView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("enters delete mode and shows checkboxes + delete selected + cancel", async () => {
    mockFetchSequence([
      { ok: true, entries: [{ name: "world", type: "dir", size: null, modified: "2026-05-07T00:00:00.000Z" }] },
    ]);

    render(<FilesView />);
    await screen.findByText("world");

    fireEvent.click(screen.getByText("Delete files"));
    expect(screen.getByText("Delete selected")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Select world" })).toBeInTheDocument();
  });

  it("removes per-row pencil and x icons", async () => {
    mockFetchSequence([
      { ok: true, entries: [{ name: "server.properties", type: "file", size: 12, modified: "2026-05-07T00:00:00.000Z" }] },
    ]);

    render(<FilesView />);
    await screen.findByText("server.properties");

    expect(screen.queryByText("✏️")).not.toBeInTheDocument();
    expect(screen.queryByText("✕")).not.toBeInTheDocument();
  });

  it("clicking emoji toggles a directory", async () => {
    mockFetchSequence([
      { ok: true, entries: [{ name: "world", type: "dir", size: null, modified: "2026-05-07T00:00:00.000Z" }] },
      { ok: true, entries: [{ name: "server.properties", type: "file", size: 12, modified: "2026-05-07T00:00:00.000Z" }] },
    ]);

    render(<FilesView />);
    await screen.findByText("world");

    fireEvent.click(screen.getByText("📁"));
    await screen.findByText("server.properties");
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run:

```bash
cd client && npm test
```

Expected: FAIL because delete mode/checkboxes/emoji click aren’t implemented and icons still exist.

- [ ] **Step 3: Commit failing tests**

```bash
git add client/src/views/__tests__/FilesView.test.tsx
git commit -m "test: add failing tests for files bulk delete"
```

---

### Task 3: Implement Delete Mode + Row Interaction Updates

**Files:**
- Modify: `client/src/views/FilesView.tsx`

- [ ] **Step 1: Add delete-mode state + helpers**

Add state near other `useState` calls:

```ts
const [deleteMode, setDeleteMode] = useState(false);
const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
```

Add helpers:

```ts
function toggleSelected(fp: string) {
  setSelectedPaths(prev => {
    const next = new Set(prev);
    if (next.has(fp)) next.delete(fp);
    else next.add(fp);
    return next;
  });
}

function exitDeleteMode() {
  setDeleteMode(false);
  setSelectedPaths(new Set());
}
```

- [ ] **Step 2: Add bulk delete handler with recursive warning**

Add handler:

```ts
async function deleteSelected() {
  if (selectedPaths.size === 0) return;
  const confirmMsg = "This will permanently delete selected files and folders (recursive). Continue?";
  if (!confirm(confirmMsg)) return;
  for (const fp of selectedPaths) {
    const r = await fetch(`/api/files?path=${encodeURIComponent(fp)}`, { method: "DELETE", credentials: "include" });
    const j = await r.json();
    if (!j.ok) {
      setErr(j.message ?? "Delete failed");
      return;
    }
    if (selected === fp) { setSelected(null); setContent(null); }
  }
  exitDeleteMode();
  load(cwd);
}
```

- [ ] **Step 3: Update header controls**

Replace the header actions with delete-mode toggle:

```tsx
<PageHeader title="Files">
  <div className="flex gap-2">
    {!deleteMode ? (
      <>
        <button onClick={() => setShowNew("file")} className="badge px-3 py-1 rounded-full text-xs hover:bg-white/10 transition-colors">+ File</button>
        <button onClick={() => setShowNew("dir")}  className="badge px-3 py-1 rounded-full text-xs hover:bg-white/10 transition-colors">+ Folder</button>
        <button onClick={() => setDeleteMode(true)} className="badge px-3 py-1 rounded-full text-xs hover:bg-white/10 transition-colors">Delete files</button>
      </>
    ) : (
      <>
        <button
          onClick={deleteSelected}
          disabled={selectedPaths.size === 0}
          className="badge px-3 py-1 rounded-full text-xs bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors disabled:opacity-40"
        >
          Delete selected
        </button>
        <button onClick={exitDeleteMode} className="badge px-3 py-1 rounded-full text-xs hover:bg-white/10 transition-colors">Cancel</button>
      </>
    )}
  </div>
</PageHeader>
```

- [ ] **Step 4: Add checkbox column and emoji click handling**

In `renderRows`, add checkbox before the arrow and make emoji clickable:

```tsx
{deleteMode ? (
  <input
    type="checkbox"
    aria-label={`Select ${e.name}`}
    checked={selectedPaths.has(fp)}
    onChange={() => toggleSelected(fp)}
    onClick={ev => ev.stopPropagation()}
    className="h-3.5 w-3.5 accent-emerald"
  />
) : (
  <span className="w-3.5" />
)}

{e.type === "dir" ? (
  <button
    onClick={() => toggleDir(fp)}
    className="w-4 h-4 flex items-center justify-center text-white/40 hover:text-white/80 flex-shrink-0 transition-colors"
    aria-label={isExpanded ? "Collapse" : "Expand"}
  >
    ...
  </button>
) : (
  <span className="w-4 flex-shrink-0" />
)}

<span
  className="text-base leading-none select-none flex-shrink-0 cursor-pointer"
  onClick={() => e.type === "dir" ? toggleDir(fp) : openFile(fp)}
>
  {e.type === "dir" ? (isExpanded ? "📂" : "📁") : "📄"}
</span>
```

Remove the entire actions block (pencil/X buttons) from each row.

- [ ] **Step 5: Increase spacing for new file/folder input row**

Update the new item bar container:

```tsx
<div className="flex items-center gap-2 px-4 lg:px-8 py-4 my-2 bg-white/5 border-b border-white/5">
```

- [ ] **Step 6: Run tests to confirm they pass**

Run:

```bash
cd client && npm test
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add client/src/views/FilesView.tsx
git commit -m "feat: add delete mode and simplify file row actions"
```

---

## Self-Review

- Spec coverage: delete mode, checkbox selection, remove icons, emoji click, spacing, recursive confirm are all covered in Task 3.
- Placeholder scan: no TODO/TBD.
- Type consistency: uses `selectedPaths` and `deleteMode` consistently.

---

Plan complete and saved to `docs/superpowers/plans/2026-05-07-files-bulk-delete.md`. Two execution options:

1) Subagent-Driven (recommended) — I dispatch a fresh subagent per task, review between tasks
2) Inline Execution — Execute tasks in this session using executing-plans

Which approach?
