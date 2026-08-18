import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vuetify from "vite-plugin-vuetify";

// Project Pages site: served at https://gad-lang.github.io/codemirror-gad/
export default defineConfig({
  base: "/codemirror-gad/",
  plugins: [vue(), vuetify({ autoImport: true })],
});
