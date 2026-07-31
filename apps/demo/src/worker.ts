interface Env {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
}

/**
 * Cloudflare serves the Astro build through the static-assets binding.
 * Keep this Worker intentionally thin so the demo remains a static site.
 */
export default {
  fetch(request: Request, env: Env) {
    return env.ASSETS.fetch(request);
  },
};
