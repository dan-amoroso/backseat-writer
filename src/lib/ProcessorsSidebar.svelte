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

<nav class="processors-sidebar" aria-label="Personas">
  <div class="processors-sidebar-tiles">
    {#each processors as processor (processor.id)}
      <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
      <div
        class="processor-tile"
        class:processor-tile-inactive={!processor.active}
        on:click={() => dispatch("select", processor)}
        title={processor.name}
        role="button"
        tabindex="0"
        on:keydown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            dispatch("select", processor);
          }
        }}
      >
        <span class="processor-tile-avatar" aria-hidden="true"></span>
        <span class="processor-tile-name">{processor.name}</span>
        <span class="processor-tile-model">{processor.model}</span>
        <span class="processor-tile-provider">{processor.provider}</span>
        <button
          class="processor-mute"
          class:processor-mute-active={processor.active}
          on:click={(e) => onToggleClick(e, processor.id)}
          aria-pressed={processor.active}
          aria-label={processor.active
            ? `Mute ${processor.name}`
            : `Unmute ${processor.name}`}
          title={processor.active ? "Mute persona" : "Unmute persona"}
          type="button"
        >
          {#if processor.active}
            <svg
              class="processor-mute-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M11 5l-5 4H3v6h3l5 4V5z" />
              <path d="M16 9a4 4 0 0 1 0 6" />
              <path d="M18.5 6.5a7 7 0 0 1 0 11" />
            </svg>
          {:else}
            <svg
              class="processor-mute-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M11 5l-5 4H3v6h3l5 4V5z" />
              <path d="M23 9l-6 6" />
              <path d="M17 9l6 6" />
            </svg>
          {/if}
        </button>
      </div>
    {/each}
  </div>
  <button
    class="processor-add-btn"
    on:click={() => dispatch("add")}
    aria-label="Add persona"
    title="Add persona"
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
