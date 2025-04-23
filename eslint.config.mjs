// This configuration only applies to the package manager root.
import libraryConfig from "@repo/eslint-config/library.js";
import tseslint from "typescript-eslint";

/** @type {import("eslint").Linter.Config} */
export default [
    {
        ignores: ["apps/**", "packages/**"],
    },
    ...libraryConfig,
    ...tseslint.config({
        files: ["**/*.ts", "**/*.tsx"],
        languageOptions: {
            parserOptions: {
                project: true,
            },
        },
    }),
];