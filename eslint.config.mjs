import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Désactive les règles de style qui entreraient en conflit avec Prettier.
  prettier,
  // XSS (SCRUM-69) : tout texte passe par l'échappement de React ; injecter du HTML brut est interdit.
  { rules: { "react/no-danger": "error" } },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Profils de navigateur des captures, non suivis : parfois verrouillés par Windows.
    ".captures/**",
    ".video*/**",
    // Rapports Playwright (SCRUM-62), générés.
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
