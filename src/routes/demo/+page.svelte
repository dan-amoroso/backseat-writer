<script lang="ts">
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import { goto } from "$app/navigation";
  import type { Comment } from "$lib/comments";
  import { removeStorageKey, saveJson } from "$lib/storage";

  const DEMO_MARKDOWN = `
## Hi, this is Dan. I have been working on my writing

> I aim for 1000 words per day, and building Backseat Writer has made it even more fun. It is a hobby text editor that uses AI as a soundingboard rather than producing your text. 

I want to expand it to where it will handle citations and sources, suggest clarifications and audience specific reactions.

For example, just for a bit of fun, the default _Personas_ you see on the left include 'HN snark' to help me predict some of the sass my posts will get on HN. What's really funny is that it often catches some useful stuff.

Back when I was writing RFCs I would have loved to use something like NotebookLM to cross reference the company's knowledge base.

I also integrate it with perplexity to do fact checking and research for me. Thats still very much a WIP.

Processors don't necessarily need to be AI powered, infact I am planning to have some programmatic ones such as spellchecking and some advanced markdown magic like automatic linking of mentions to definitions, footnotes, etc.

## How?

Write text, hit "get feedback" on the top right. The app is BYOK at the moment, and it runs clientside only.

## Why?

Because how else to consume my free credits? :)
`;

  const DEMO_COMMENTS: Comment[] = [];

  onMount(async () => {
    if (!browser) return;

    // Force the main editor to initialize from markdown on first load.
    removeStorageKey("editor-state");
    saveJson("editor-markdown", DEMO_MARKDOWN);
    saveJson("comments", DEMO_COMMENTS);

    await goto("/");
  });
</script>

<main class="about-page">
  <header class="about-header">
    <h1>Preparing demo…</h1>
  </header>
  <section class="about-body">
    <p>Loading the demo editor state.</p>
    <p>
      New here? Read the <a href="/about">About page</a> for context.
    </p>
  </section>
</main>
