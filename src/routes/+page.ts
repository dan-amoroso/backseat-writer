import posthog from "posthog-js";
import { browser } from "$app/environment";

export const load = async () => {
  if (browser) {
    posthog.init("phc_MKUgmXZDYjvzWaiftpbb520VW4zZr2bIEB8i2Hco2Xb", {
      api_host: "https://eu.i.posthog.com",
      defaults: "2025-11-30",
      disable_cookie: true,
      persistence: "memory",
    });
  }

  return;
};
