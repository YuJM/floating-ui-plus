<script setup lang="ts">
import MiddlewareCase from '../components/MiddlewareCase.vue';
import {MIDDLEWARE_EXAMPLES} from '../../middleware-registry';
</script>

<template>
  <div class="vue-middleware-grid">
      <MiddlewareCase
        v-for="item in MIDDLEWARE_EXAMPLES"
        :key="item.id"
        :index="item.number"
        :kind="item.id"
        :title="item.title"
        :doc-href="`https://floating-ui.com/docs/${item.docsPath}`"
        :detail="item.description"
      />
  </div>
</template>
