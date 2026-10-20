import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2022",
    assetsInlineLimit: 2048,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: "three-core", test: /three[\\/]build[\\/]three\.core/ },
            {
              name: "three-renderer",
              test: /three[\\/]build[\\/]three\.module/,
            },
            {
              name: "react",
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            },
          ],
        },
      },
    },
  },
});
