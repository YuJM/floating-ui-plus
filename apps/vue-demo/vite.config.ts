import vue from '@vitejs/plugin-vue';
import {defineConfig} from 'vite';

export default defineConfig({
  plugins: [vue()],
  define: {
    __DEV__: true,
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
  },
});
