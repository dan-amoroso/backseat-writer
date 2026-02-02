# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

BackseatWriter is a web-based rich text editor for writers with AI feedback integration. Users write in a Lexical-based editor, annotate text with "targets" (`==text==` syntax), and request AI feedback from providers like OpenAI and Perplexity. All data is stored in browser localStorage.

## Commands

- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run check` — Type check (svelte-kit sync + svelte-check). **Run after every change.**
- No test framework is configured. If tests are needed, install Vitest first.

## Architecture

**SvelteKit 2 + Svelte 5 + TypeScript (strict) + Lexical editor**

- `src/routes/+page.svelte` — Main application page (~1300 lines). Contains settings modal, feedback widget, layout, and most UI logic.
- `src/lib/Editor.svelte` — Lexical editor setup with markdown shortcuts and custom nodes.
- `src/lib/nodes/TargetNode.ts` — Custom Lexical node for `==target==` annotations, rendered as `<mark>` elements with `data-target-id`.
- `src/lib/storage.ts` — localStorage persistence via `createPersistentStore<T>(key, default)` utility. All keys prefixed with `backseatwriter:`.
- `src/lib/perplexity.ts`, `src/lib/openai.ts` — API clients with key validation.
- `src/lib/comments.ts` — Comment CRUD linked to targets by `targetId`.
- `src/lib/themes/` — Lexical editor themes (VS Code Dark, IntelliJ Darcula).
- `src/lib/Sidebar.svelte`, `src/lib/CommentBubble.svelte` — UI components.

## Key Conventions

**Imports:** Always use `$lib/` alias for `src/lib` imports. Use `import { browser } from '$app/environment'` to guard browser-only code (localStorage, window, document).

**Component model — props down, events up:** Components are functional display units. They receive all data via props and never use `bind:` to mutate parent state. Instead, they emit events upward so the parent (page or parent component) owns and manages state. This means components may hold minor internal state (e.g., an input's current text buffer) but only emit the result after debouncing or on commit — an input component should not fire an event on every keystroke, but rather debounce or emit on blur/enter. The parent receives the event, updates its store or local state, and the new value flows back down as props. This keeps components predictable and testable: given the same props, they render the same output.

**Stores:** Use Svelte `writable`/`derived` stores for global state. Use `createPersistentStore` from `$lib/storage` for localStorage-backed state.

**Semantic HTML:** Use meaningful elements over generic `<div>`/`<span>`. Prefer `<nav>`, `<aside>`, `<main>`, `<section>`, `<article>`, `<header>`, `<footer>`, `<details>`, `<summary>`, `<dialog>`, `<fieldset>`, `<legend>`, `<label>`, `<button>`, `<time>`, `<mark>`, etc. for what they represent. Use `<div>` only as a last resort for pure layout wrappers with no semantic meaning. This improves accessibility, readability, and makes CSS selectors more intentional.

**CSS — external stylesheets, not component styles:** Prefer keeping components free of `<style>` blocks. All styling lives in external CSS files using semantic class names and CSS custom properties for theming. This means:

- **No `<style>` in components.** Components apply class names in their markup; CSS rules live in shared stylesheets.
- **Semantic class names** that describe _what_ the element is, not how it looks. Use `.feedback-panel`, `.comment-author`, `.editor-workspace`, `.api-key-input` — not `.blue-box`, `.mt-4`, `.flex-row`, `.large-text`.
- **Design tokens as `--bsw-*` custom properties** (e.g., `--bsw-color-bg`, `--bsw-color-text`, `--bsw-radius-md`, `--bsw-spacing-sm`, `--bsw-font-mono`) defined at the root level. Stylesheets reference these variables — never raw hex/rgb/hsl literals for anything theme-sensitive.
- **Theming by swapping custom property values** at the root, not rewriting selectors or component markup.

**Svelte component structure:** `<script lang="ts">` → template (no `<style>` block).

**Lexical:** All editor state mutations must happen inside Lexical `update` callbacks. Custom nodes are registered in `Editor.svelte`. When adding API providers, update `apiKeyProviders` in the UI and the `Settings` type.

**Naming:** Components PascalCase, functions/variables camelCase, constants UPPER_SNAKE_CASE.
