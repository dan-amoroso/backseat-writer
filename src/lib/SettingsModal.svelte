<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import {
    settings,
    setApiKey,
    setVerifiedKey,
    clearStorage,
    clearStorageExcept,
    setSetting,
  } from "$lib/storage";
  import { isProvider, providerModules } from "$lib/providerRegistry";
  import posthog from "posthog-js";
  import { browser } from "$app/environment";

  const dispatch = createEventDispatcher<{ close: void }>();

  const apiKeyProviders: {
    name: string;
    placeholder: string;
    canValidate: boolean;
  }[] = [
    { name: "OpenAI", placeholder: "sk-...", canValidate: true },
    { name: "Perplexity", placeholder: "pplx-...", canValidate: true },
    { name: "Qwen", placeholder: "sk-...", canValidate: true },
    { name: "Grok", placeholder: "xai-...", canValidate: true },
    { name: "Anthropic", placeholder: "sk-ant-...", canValidate: false },
    { name: "Mistral", placeholder: "mk-...", canValidate: true },
    { name: "Zen", placeholder: "zen-...", canValidate: false },
    { name: "Gemini", placeholder: "AIza...", canValidate: true },
  ];

  let apiKeys: Record<string, string> = {};
  let keyVisibility: Record<string, boolean> = {};
  let keyStatus: Record<string, "idle" | "validating" | "valid" | "invalid"> =
    {};
  let keyError: Record<string, string> = {};
  let keyValidationTimers: Record<string, ReturnType<typeof setTimeout>> = {};
  let fontScale = 1;
  let clearStorageDialogOpen = false;
  let clearStorageClearKeysToo = false;

  function canUsePosthog(): boolean {
    if (!browser) return false;
    const host = window.location.hostname;
    return host !== "localhost" && host !== "127.0.0.1" && host !== "::1";
  }

  function onApiKeyInput(provider: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    setApiKey(provider, value);

    const providerDef = apiKeyProviders.find((p) => p.name === provider);
    if (!providerDef?.canValidate) return;

    clearTimeout(keyValidationTimers[provider]);
    keyError[provider] = "";

    if (!value.trim()) {
      keyStatus[provider] = "idle";
      setVerifiedKey(provider, false);
      return;
    }

    keyStatus[provider] = "validating";
    keyValidationTimers[provider] = setTimeout(async () => {
      const module = isProvider(provider) ? providerModules[provider] : null;
      if (!module?.canValidate) return;
      const result = await module.validateKey(value);
      if (apiKeys[provider] === value) {
        if (result.valid) {
          keyStatus[provider] = "valid";
          keyError[provider] = "";
          setVerifiedKey(provider, true);
          if (canUsePosthog()) {
            posthog?.capture?.("api_key_configured", { provider });
          }
        } else {
          keyStatus[provider] = "invalid";
          keyError[provider] = result.error;
          setVerifiedKey(provider, false);
        }
      }
    }, 800);
  }

  async function validateKeyNow(provider: string) {
    const value = $settings.apiKeys?.[provider] || "";
    clearTimeout(keyValidationTimers[provider]);
    keyError[provider] = "";

    if (!value.trim()) {
      keyStatus[provider] = "idle";
      setVerifiedKey(provider, false);
      return;
    }

    keyStatus[provider] = "validating";
    const module = isProvider(provider) ? providerModules[provider] : null;
    if (!module?.canValidate) return;
    const result = await module.validateKey(value);
    if (apiKeys[provider] === value) {
      if (result.valid) {
        keyStatus[provider] = "valid";
        keyError[provider] = "";
        setVerifiedKey(provider, true);
        if (canUsePosthog()) {
          posthog?.capture?.("api_key_configured", { provider });
        }
      } else {
        keyStatus[provider] = "invalid";
        keyError[provider] = result.error;
        setVerifiedKey(provider, false);
      }
    }
  }

  function toggleKeyVisibility(provider: string) {
    keyVisibility[provider] = !keyVisibility[provider];
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

  function handleClearStorage() {
    if (!browser) return;
    clearStorageClearKeysToo = false;
    clearStorageDialogOpen = true;
  }

  function closeClearStorageDialog() {
    clearStorageDialogOpen = false;
  }

  function onClearStorageDialogBackdropClick(event: MouseEvent) {
    event.stopPropagation();
    if (event.target === event.currentTarget) {
      closeClearStorageDialog();
    }
  }

  function onClearStorageDialogKeydown(event: KeyboardEvent) {
    event.stopPropagation();
    if (event.key === "Escape") {
      closeClearStorageDialog();
    }
  }

  function confirmClearStorage() {
    if (!browser) return;
    if (clearStorageClearKeysToo) {
      clearStorage();
    } else {
      clearStorageExcept(["settings"]);
    }
    window.location.reload();
  }

  $: if ($settings) {
    apiKeys = $settings.apiKeys || {};
    fontScale = $settings.uiFontScale ?? 1;
    const verifiedKeys = $settings.verifiedKeys || {};
    for (const provider of apiKeyProviders) {
      const hasKey = !!apiKeys[provider.name];
      const isVerified = verifiedKeys[provider.name];
      if (hasKey && isVerified) {
        keyStatus[provider.name] = "valid";
      } else if (hasKey && !isVerified && provider.canValidate) {
        keyStatus[provider.name] = "invalid";
      } else if (!hasKey) {
        keyStatus[provider.name] = "idle";
      }
    }
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
<div
  class="settings-backdrop"
  on:click={onBackdropClick}
  on:keydown={onKeydown}
>
  <div class="settings-modal" role="dialog" aria-label="Settings">
    <div class="settings-header">
      <div class="settings-header-left">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="settings-header-icon"
        >
          <path
            d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
          />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <h2>Settings</h2>
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
        <h3 class="settings-section-title">
          <span class="section-title-bar"></span>
          API Keys
        </h3>
        <p class="settings-section-desc">
          Keys are stored locally in your browser and never sent to our servers.
        </p>
        {#each apiKeyProviders as provider}
          <div class="api-key-row">
            <div class="api-key-name">{provider.name}</div>
            <div class="api-key-input-row">
              <div class="api-key-input-wrap">
                <input
                  type={keyVisibility[provider.name] ? "text" : "password"}
                  class="api-key-input"
                  placeholder={provider.placeholder}
                  value={apiKeys[provider.name] || ""}
                  on:input={(e) => onApiKeyInput(provider.name, e)}
                  spellcheck="false"
                  autocomplete="off"
                />
                <button
                  class="api-key-toggle"
                  on:click={() => toggleKeyVisibility(provider.name)}
                  aria-label={keyVisibility[provider.name]
                    ? "Hide key"
                    : "Show key"}
                  tabindex="-1"
                >
                  {#if keyVisibility[provider.name]}
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  {:else}
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path
                        d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"
                      />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  {/if}
                </button>
              </div>
              <button
                class="api-key-validate"
                on:click={() => validateKeyNow(provider.name)}
                disabled={!apiKeys[provider.name] ||
                  keyStatus[provider.name] === "validating"}
                type="button"
              >
                Validate
              </button>
              {#if keyStatus[provider.name] === "validating"}
                <div class="api-key-validation-icon">
                  <svg
                    class="api-key-spinner"
                    width="16"
                    height="16"
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
                </div>
              {:else if keyStatus[provider.name] === "valid"}
                <div class="api-key-validation-icon api-key-validation-valid">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="#4ec9b0"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M3.5 8.5L6.5 11.5L12.5 4.5" />
                  </svg>
                </div>
              {:else if keyStatus[provider.name] === "invalid"}
                <div
                  class="api-key-validation-icon api-key-validation-invalid"
                  title={keyError[provider.name] || "Invalid key"}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="#a83232"
                    stroke-width="2"
                    stroke-linecap="round"
                  >
                    <path d="M4 4l8 8M12 4l-8 8" />
                  </svg>
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
      <div class="settings-section">
        <h3 class="settings-section-title">
          <span class="section-title-bar"></span>
          Interface
        </h3>
        <label class="settings-font-label">
          Font size
          <select
            class="settings-font-select"
            bind:value={fontScale}
            on:change={(event) =>
              setSetting(
                "uiFontScale",
                Number((event.target as HTMLSelectElement).value),
              )}
          >
            <option value="0.9">Small</option>
            <option value="1">Normal</option>
            <option value="1.1">Large</option>
            <option value="1.2">Extra Large</option>
          </select>
        </label>
      </div>
      <div class="settings-section">
        <h3 class="settings-section-title">
          <span class="section-title-bar"></span>
          Storage
        </h3>
        <p class="settings-section-desc">
          Clear saved editor content, comments, and personas stored in this
          browser. You can choose whether to also clear API keys.
        </p>
        <button
          class="settings-clear-storage"
          on:click={handleClearStorage}
          type="button"
        >
          Clear local storage for this app
        </button>
      </div>
    </div>
  </div>
</div>

{#if clearStorageDialogOpen}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div
    class="settings-backdrop"
    on:click={onClearStorageDialogBackdropClick}
    on:keydown={onClearStorageDialogKeydown}
  >
    <div class="share-dialog" role="dialog" aria-label="Clear local storage">
      <div class="share-dialog-header">
        <div class="share-dialog-title">Clear Local Storage</div>
        <button
          class="share-dialog-close"
          on:click={closeClearStorageDialog}
          aria-label="Close"
          type="button"
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
      <div class="share-dialog-body">
        <p class="share-dialog-text">
          Clear saved editor content, comments, and personas from this browser?
        </p>
        <p class="share-dialog-subtext">This cannot be undone.</p>
        <label class="settings-checkbox-label">
          <input type="checkbox" bind:checked={clearStorageClearKeysToo} />
          Also clear saved API keys
        </label>
      </div>
      <footer class="share-dialog-footer">
        <button
          class="confirm-dialog-cancel"
          on:click={closeClearStorageDialog}
          type="button"
        >
          Cancel
        </button>
        <button
          class="confirm-dialog-danger"
          on:click={confirmClearStorage}
          type="button"
        >
          Clear storage
        </button>
      </footer>
    </div>
  </div>
{/if}
