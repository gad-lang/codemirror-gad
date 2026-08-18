import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vuetify from "vite-plugin-vuetify";

// Project Pages site: served at https://gad-lang.github.io/codemirror-gad/
export default defineConfig({
  base: "/codemirror-gad/",
  plugins: [vue(), vuetify({ autoImport: true })],
  // The site imports the plugin source (../src), whose @codemirror/* imports
  // would otherwise resolve to a second copy in the repo-root node_modules.
  // Dedupe so a single instance is used (else instanceof checks break with
  // "Unrecognized extension value in extension set").
  resolve: {
    dedupe: [
      "@codemirror/state", "@codemirror/view", "@codemirror/language",
      "@codemirror/autocomplete", "@codemirror/lint", "@codemirror/commands",
      "@lezer/highlight", "vue",
    ],
  },
});
