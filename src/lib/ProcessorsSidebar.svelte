<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { Processor } from "$lib/processors";

  export let processors: Processor[] = [];

  const dispatch = createEventDispatcher<{
    select: Processor;
    add: void;
  }>();
</script>

<nav class="processors-sidebar" aria-label="Processors">
  <div class="processors-sidebar-tiles">
    {#each processors as processor (processor.id)}
      <button
        class="processor-tile"
        on:click={() => dispatch("select", processor)}
        title={processor.name}
        type="button"
      >
        <span class="processor-tile-name">{processor.name}</span>
        <span class="processor-tile-model">{processor.model}</span>
      </button>
    {/each}
  </div>
  <button
    class="processor-add-btn"
    on:click={() => dispatch("add")}
    aria-label="Add processor"
    title="Add processor"
    type="button"
  >
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  </button>
</nav>
