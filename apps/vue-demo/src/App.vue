<script setup lang="ts">
import {RouterLink, RouterView} from 'vue-router';

const links = [
  ['/', 'Overview'],
  ['/examples/tooltip', 'Tooltip'],
  ['/examples/popover', 'Popover'],
  ['/examples/menu', 'Menu'],
  ['/examples/nested-menu', 'Nested menu'],
  ['/examples/client-point', 'Cursor'],
  ['/examples/combobox', 'Combobox'],
  ['/placement', 'Placement'],
  ['/middleware', 'Middleware'],
  ['/examples/modal', 'Modal'],
] as const;
</script>

<template>
  <div class="min-h-screen overflow-hidden bg-vue-canvas text-vue-ink">
    <header class="mx-auto w-[min(1180px,calc(100%-4rem))] py-10 sm:py-14">
      <div class="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.12em] text-vue-muted">
        <i class="h-2 w-2 rounded-full bg-vue-green shadow-[0_0_0_5px_rgb(66_184_131_/_16%)]" />
        floating-ui-plus / vue lab
      </div>
      <div class="mt-7 flex items-end justify-between gap-8">
        <div>
          <RouterLink class="no-underline" to="/" aria-label="Floating UI Plus Vue demo home">
            <h1 class="font-display text-[clamp(4rem,10.3vw,8.9rem)] font-medium leading-[.78] tracking-[-.09em] text-vue-ink">
              Floating UI<br />
              <em class="not-italic text-vue-green">Plus</em>
              <span class="ml-[.25em] align-middle text-[.24em] uppercase tracking-[.04em] text-vue-deep">
                Vue demo
              </span>
            </h1>
          </RouterLink>
          <p class="mt-6 max-w-md text-sm leading-6 text-vue-muted">
            Reactive positioning and interaction pipelines, expressed with Vue
            Router, Teleport, Transition, and Composition API.
          </p>
        </div>
        <div class="hidden min-w-40 border-l border-vue-line px-4 py-3 sm:grid">
          <span class="font-mono text-[10px] uppercase tracking-[.1em] text-vue-muted">reactivity</span>
          <strong class="mt-1 text-5xl font-medium tracking-[-.1em]">03</strong>
          <span class="mt-2 font-mono text-[9px] uppercase tracking-[.08em] text-vue-muted">web + vue</span>
        </div>
      </div>
      <nav class="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t border-vue-line pt-4" aria-label="Vue demo routes">
        <RouterLink
          v-for="[to, label] in links"
          :key="to"
          :to="to"
          class="font-mono text-[10px] uppercase tracking-[.07em] text-vue-muted no-underline transition hover:text-vue-green"
        >
          {{ label }}
        </RouterLink>
      </nav>
    </header>

    <main class="mx-auto w-[min(1180px,calc(100%-4rem))]">
      <RouterView />
    </main>

    <footer class="mx-auto flex w-[min(1180px,calc(100%-4rem))] flex-wrap justify-between gap-4 py-8 font-mono text-[10px] uppercase tracking-[.07em] text-vue-muted">
      <span>floating-ui-plus</span>
      <span>@floating-ui-plus/web / @floating-ui-plus/vue / vue 3</span>
      <span class="text-vue-green">● reactive surface ready</span>
    </footer>
  </div>
</template>
