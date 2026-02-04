<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { Processor } from "$lib/processors";
  import type { Provider } from "$lib/pipeline";
  import { settings } from "$lib/storage";
  import { getModels } from "$lib/modelCache";

  export let processor: Processor;

  const dispatch = createEventDispatcher<{
    save: Processor;
    delete: string;
    close: void;
  }>();

  const providers: Provider[] = [
    "OpenAI",
    "Perplexity",
    "Gemini",
    "Mistral",
    "Qwen",
    "Grok",
  ];

  let name = processor.name;
  let personality = processor.personality;
  let provider: Provider = processor.provider;
  let model = processor.model;
  let includeEvaluation = processor.includeEvaluation;
  let confirmingDelete = false;

  let availableModels: string[] = [];
  let modelsLoading = false;
  let modelsError = "";

  async function fetchModels(p: Provider) {
    modelsLoading = true;
    modelsError = "";
    availableModels = [];

    const apiKeys = $settings.apiKeys || {};
    const key = apiKeys[p];

    if (!key) {
      modelsError = `No API key configured for ${p}`;
      modelsLoading = false;
      return;
    }

    try {
      availableModels = await getModels(p, key);
    } catch (err) {
      modelsError =
        err instanceof Error ? err.message : "Failed to fetch models";
    } finally {
      modelsLoading = false;
    }

    if (availableModels.length > 0 && !availableModels.includes(model)) {
      model = availableModels[0];
    }
  }

  $: fetchModels(provider);

  function handleSave() {
    dispatch("save", {
      ...processor,
      name,
      personality,
      provider,
      model,
      includeEvaluation,
    });
  }

  function handleDelete() {
    if (!confirmingDelete) {
      confirmingDelete = true;
      return;
    }
    dispatch("delete", processor.id);
  }

  function onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      dispatch("close");
    }
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      dispatch("close");
    }
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<div
  class="settings-backdrop"
  on:click={onBackdropClick}
  on:keydown={onKeydown}
>
  <div class="processor-modal" role="dialog" aria-label="Edit Processor">
    <div class="settings-header">
      <div class="settings-header-left">
        <h2>Edit Processor</h2>
      </div>
      <button
        class="settings-close"
        on:click={() => dispatch("close")}
        aria-label="Close"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        >
          <path d="M1 1l12 12M13 1L1 13" />
        </svg>
      </button>
    </div>

    <div class="settings-body">
      <div class="settings-section">
        <fieldset class="processor-modal-field">
          <label class="processor-modal-label">
            Name
            <input
              type="text"
              class="processor-modal-input"
              bind:value={name}
              placeholder="Processor name"
            />
          </label>
        </fieldset>

        <fieldset class="processor-modal-field">
          <label class="processor-modal-label">
            Personality prompt
            <textarea
              class="processor-modal-textarea"
              bind:value={personality}
              rows="6"
              placeholder="System prompt for this processor..."
            ></textarea>
          </label>
        </fieldset>

        <fieldset class="processor-modal-field">
          <label class="processor-modal-label">
            Provider
            <select class="processor-modal-select" bind:value={provider}>
              {#each providers as p}
                <option value={p}>{p}</option>
              {/each}
            </select>
          </label>
        </fieldset>

        <fieldset class="processor-modal-field">
          <label class="processor-modal-label">
            Model
            {#if modelsLoading}
              <div class="processor-modal-models-status">
                <svg
                  class="feedback-spinner"
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <circle
                    cx="8"
                    cy="8"
                    r="6"
                    stroke="rgba(255,255,255,0.08)"
                    stroke-width="2"
                  />
                  <path
                    d="M14 8a6 6 0 0 0-6-6"
                    stroke="#569cd6"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                </svg>
                Loading models...
              </div>
            {:else if modelsError}
              <div class="processor-modal-models-error">{modelsError}</div>
              <input
                type="text"
                class="processor-modal-input"
                bind:value={model}
                placeholder="e.g. gpt-4o-mini"
              />
            {:else if availableModels.length > 0}
              <select class="processor-modal-select" bind:value={model}>
                {#each availableModels as m}
                  <option value={m}>{m}</option>
                {/each}
              </select>
            {:else}
              <input
                type="text"
                class="processor-modal-input"
                bind:value={model}
                placeholder="e.g. gpt-4o-mini"
              />
            {/if}
          </label>
        </fieldset>

        <fieldset class="processor-modal-field">
          <label class="processor-modal-checkbox-label">
            <input type="checkbox" bind:checked={includeEvaluation} />
            Include overall evaluation
          </label>
        </fieldset>
      </div>
    </div>

    <footer class="processor-modal-footer">
      <button
        class="processor-modal-delete"
        on:click={handleDelete}
        type="button"
      >
        {confirmingDelete ? "Confirm Delete" : "Delete"}
      </button>
      <button class="processor-modal-save" on:click={handleSave} type="button">
        Save
      </button>
    </footer>
  </div>
</div>
