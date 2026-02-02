<script lang="ts">
  import type { Writable } from "svelte/store";

  export let editorStateJson: Writable<string>;

  let open = false;
</script>

<div class="debug-widget">
  <button
    class="debug-toggle"
    class:debug-toggle-active={open}
    on:click={() => (open = !open)}
    aria-label="Toggle editor state"
  >
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
    <span class="debug-toggle-label">&lt;/&gt;</span>
  </button>
  {#if open}
    <div class="debug-panel">
      <div class="debug-panel-header">Editor State</div>
      <pre class="debug-panel-content">{$editorStateJson}</pre>
    </div>
  {/if}
</div>
