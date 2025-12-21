# AGENTS.md

Guidelines for humans and AI coding assistants working on this repository.

This document is **about how to work** in this codebase (principles, style, and expectations).  
For architecture and implementation details, see @PLAN.md.

---

## 1. Goals & Non‑Goals

### 1.1 Primary goals

- Keep the app **simple, robust, and easy to change**.
- Optimize for **clarity over cleverness**.
- Make it easy to **evolve sync, transport, and storage** later without rewriting the UI.

### 1.2 Non‑goals

- No premature “production‑grade everything” (Kubernetes, complex infra, etc.).
- No unnecessary abstractions “just in case”.
- No over‑engineering of real‑time sync (CRDTs, etc.) beyond what the assignment needs.

---

## 2. How to Approach Changes

When you add or change something, follow this order of thinking:

1. **Understand the intent**
   - Re‑read the @ASSIGNMENT.md.
   - Ask: _“Does this change help demonstrate solid full‑stack/product judgment?”_

2. **Keep the mental model simple**
   - Data model: Lists, Todos, Users (with sequential states and optimistic sync).
   - Flows: join/create list → see todos → update states → keep in sync.

3. **Prefer small, composable steps**
   - Make small commits.
   - Keep functions/components short and single‑purpose.

4. **Document trade‑offs**
   - If you deliberately leave something out or simplify it, add a short comment explaining **why**.

---

## 3. Coding Style & Conventions

### 3.1 General

- **Minimal** - Absolute minimum code needed.
- Use **TypeScript** where possible.
- Prefer **explicit types** on public functions and boundaries (API handlers, store functions).
- **Type-Exact** - Strict TypeScript types with zero `any`:
  - NEVER use `any` type - always use proper TypeScript types.
  - Import and use existing type definitions from the codebase.
  - Use `unknown` instead of `any` when type is truly unknown.
- **Performant** - Focus on performance and readability.
- **SOLID** - Respect SOLID principles.
- **Self-documenting** - Code explains itself through:
  - Precise naming (verbs for functions, nouns for variables).
  - Single-responsibility components.
  - Obvious data flow.
  - Add short comments when necessary.
- Use **descriptive names** in callbacks, not single letters:
  - ✅ `todosStore.update((state) => ({ ...state, todos: newTodos }))`
  - ❌ `todosStore.update((s) => ({ ...s, todos: newTodos }))`
- **File structure** - types and public API first for better cognition:
  - ✅ Types → Config → Public API (exports) → Internal implementation
  - ❌ Implementation → Helpers → Public API at the end
- Name things by **domain meaning**, not implementation detail:
  - ✅ `advanceTodoState`, `syncTodos`, `pendingMutations`
  - ❌ `handleClick3`, `doStuff`, `data1`
- **File naming**:
  - Use **kebab-case** for all file names (e.g., `sync-engine.ts`, `browser-host-platform.ts`)
  - **Exception**: Svelte components use **PascalCase** (e.g., `TodoItem.svelte`, `AddTodo.svelte`)
  - ✅ `sync-engine.svelte.ts`, `state-machine.test.ts`, `api-client.ts`
  - ❌ `syncEngine.ts`, `stateMachine.test.ts`, `apiClient.ts`
- **String literal types**:
  - Use **kebab-case** for string literal union types (status, action types, etc.)
  - ✅ `type Status = "loading" | "ready" | "session-expired"`
  - ❌ `type Status = "loading" | "ready" | "sessionExpired"`

### 3.2 Frontend (Svelte + Electron shell)

- Keep Svelte components **lean**:
  - UI/layout logic in components.
  - Business logic in separate modules/stores (e.g. `todoStore`, `syncEngine`).
- Avoid tight coupling between components and network code:
  - Call **store or service functions**, not `fetch` directly inside every component.
- Prefer **derived state** over duplicating state:
  - Example: compute filtered lists (`todo`, `ongoing`, `done`) from a single todos collection.
- Avoid duplicated markup:
  - Extract repeating UI blocks into small, reusable components (`components/ui/` for generic UI, `components/` for domain-specific UI).
  - Use semantic components (e.g. `EmptyState` vs `LoadingState`) rather than overloading one component with unrelated states.

#### Styling & UI Components

- **Tailwind CSS v4** for utility-first styling
  - Theme defined in `src/renderer/src/styles/app.css` using `@theme`
  - Use `@tailwindcss/vite` plugin for Vite integration
- **tailwind-variants** for component variants
  - Define variants using `tv()` function
  - Keep variant definitions co-located with components
- **clsx + tailwind-merge** via `cn()` helper for class merging
  - Import from `lib/tailwind.ts`
- **Brand colors** (defined in theme):
  - Primary accent: `#4137FF` (poolside purple)
  - Use white text on primary buttons for contrast
- **poolside brand naming** (per Brand Operating Guide):
  - "poolside" is **always lowercase**, even at the start of a sentence
  - "poolside" is the company name, not a product name
  - Products use pattern: "poolside Assistant for [Platform]" (e.g., "poolside Assistant for Visual Studio Code")
  - API naming: "poolside Developer API" (note: "Developer" is capitalized)
  - Don't call products "app", "extension", or "plugin" externally - use "Assistant"
  - ✅ `poolside`, `poolside Assistant for IntelliJ`, `poolside Developer API`
  - ❌ `Poolside`, `PoolSide`, `the poolside app`, `poolside plugin`
- **Reusable UI components** in `components/ui/`:
  - `Button` - with variants: primary, secondary, ghost, danger
  - `Input` - with size variants
  - `Badge` - for status indicators

### 3.3 Backend (REST API)

- Keep handlers thin:
  - Parse & validate input.
  - Call domain logic (pure or mostly pure functions) in separate modules.
- Make the API **predictable**:
  - Consistent status codes (`200/201/204`, `400`, `404`, `409`, `500`).
  - Consistent response shapes for success and errors.
- Be explicit about state transitions:
  - Enforce the transition sequence on the server.
  - Do **not** accept arbitrary state jumps, even if the client is buggy.

---

## 4. Sync, Concurrency & Data Integrity

These are **core evaluation areas**. Be intentional.

### 4.1 Optimistic updates

- Local UI should feel **instant**:
  - Apply changes locally first, queue them as **pending mutations**.
  - Reconcile with server responses (success, conflict, error).
- On error:
  - Roll back to the last known good server state for that todo/list.
  - Surface a small, clear error state (e.g. “Failed to update. Click to retry.”).

### 4.2 Versioning & conflicts

- Use **server‑owned version or timestamp** for conflict detection.
- On `409` / conflict:
  - Re‑fetch canonical data from server.
  - Re‑apply still‑valid local mutations if needed (or explain in comments why we don’t).

### 4.3 Deletion

- Use **soft deletes** with `deletedAt` / equivalent so sync can reconcile removals.
- Client should treat soft‑deleted todos as gone, but server keeps history if needed.

---

## 5. Tests & Quality

### 5.1 Testing philosophy

- Focus on **behavioural tests**, not implementation details.
- Prefer a few **good, representative tests** over many brittle ones.

### 5.2 What to test

- Core domain logic:
  - State transitions (including invalid ones).
  - Conflict handling and optimistic update behaviour.
- API endpoints:
  - Happy paths (CRUD).
  - Validation errors & conflict responses.
- Sync helpers:
  - Merging server + local state.
  - Handling deleted items.

### 5.3 Code reviews

- When you finish a change, **self‑review**:
  - Read through your diffs.
  - Ask: _"Is this as simple and clear as possible?"_
  - Run `codex review` or similar AI tools to catch obvious issues.
- **Important workflow:**
  1. Make changes and stage them (`git add`)
  2. Run `codex review --uncommitted` to review before committing
  3. If codex finds issues (P1/P2), fix them first
  4. Create commit only after codex review passes
  5. Never push commits that haven't passed codex review

---

## 6. Git & Project Hygiene

- Small, coherent commits with meaningful messages:
  - ✅ `feat: add optimistic todo state updates`
  - ✅ `fix: handle 409 conflict on todo update`
- Keep the repo **easy to set up**:
  - @README.md must have clear steps to run server, client, and tests.
- Keep **dependencies minimal** and justified.
  - Add new libs only if they clearly simplify the code / clarify intent.
- **Always use the latest stable versions** for all packages in `package.json`.
  - Avoid pinning old versions unless there's a specific compatibility issue.

---

## 7. Using AI Coding Assistants

If you (human) or another AI agent generate code, follow these rules:

1. **You own the code, not the model.**
   - Always read and understand generated code before committing.
2. **Prefer hints over full generations.**
   - Use AI to draft small functions, refactors, or test cases—not entire modules at once.
3. **Check for alignment with this doc + @ASSIGNMENT.md + @README.md.**
   - No random architectural changes just because AI suggested them.
4. **No copy‑pasting opaque blocks.**
   - If you can’t explain what a piece of code does in 1–2 sentences, simplify it.

---

## 8. Principles to Re‑Read Before You Code

- **Clarity first.** Future you (or another engineer) should understand the code quickly.
- **Minimize surface area.** Fewer concepts, fewer global states, fewer magic numbers.
- **Treat sync & concurrency as first‑class.** Even in a small app, get the basics right.
- **Document trade‑offs.** A short comment or note is enough.
- **Show taste.** The goal of this repo is not just to “work”, but to demonstrate good judgment.

If you’re ever unsure, choose the option that is **simpler to explain in an interview**.
