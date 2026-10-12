import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),

  // Project rule overrides.
  {
    rules: {
      // React 19 ships a stricter react-hooks rule that flags every
      // setState() that runs synchronously when a useEffect first fires.
      // Our pages use the standard "fetch on mount, store in state"
      // pattern, which the rule treats as an anti-pattern even though it
      // is correct for the current architecture.
      //
      // TODO: migrate loading logic to SWR or React Query (or move it to
      // server components), then remove this override to re-enable the
      // rule.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
