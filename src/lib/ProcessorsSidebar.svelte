<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { Processor } from "$lib/processors";

  export let processors: Processor[] = [];

  const dispatch = createEventDispatcher<{
    select: Processor;
    toggle: string;
    add: void;
  }>();

  function onToggleClick(event: MouseEvent, id: string) {
    event.stopPropagation();
    dispatch("toggle", id);
  }
</script>

<nav class="processors-sidebar" aria-label="Processors">
  <div class="processors-sidebar-tiles">
    {#each processors as processor (processor.id)}
      <button
        class="processor-tile"
        class:processor-tile-inactive={!processor.active}
        on:click={() => dispatch("select", processor)}
        title={processor.name}
        type="button"
      >
        <span class="processor-tile-name">{processor.name}</span>
        <span class="processor-tile-model">{processor.model}</span>
        <span class="processor-tile-provider">{processor.provider}</span>
        <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
        <span
          class="processor-toggle"
          class:processor-toggle-on={processor.active}
          on:click={(e) => onToggleClick(e, processor.id)}
          role="switch"
          aria-checked={processor.active}
          aria-label="Toggle {processor.name}"
          tabindex="0"
          on:keydown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              dispatch("toggle", processor.id);
            }
          }}
        >
          <span class="processor-toggle-thumb"></span>
        </span>
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
