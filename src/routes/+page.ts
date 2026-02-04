import posthog from "posthog-js";
import { browser } from "$app/environment";

function isLocalhost(): boolean {
  if (!browser) return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

export const load = async () => {
  if (browser && !isLocalhost()) {
    posthog.init("phc_MKUgmXZDYjvzWaiftpbb520VW4zZr2bIEB8i2Hco2Xb", {
      api_host: "https://eu.i.posthog.com",
      defaults: "2025-11-30",
      disable_cookie: true,
      persistence: "memory",
    });
  } else if (browser) {
    posthog?.opt_out_capturing?.();
  }

  return;
};
