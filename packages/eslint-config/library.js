import { resolve } from "node:path";

/** @type {import("eslint").Linter.Config[]} */
export default [
    {
        ignores: [".*.js", "node_modules/", "dist/"],
        plugins: ["only-warn"],
        globals: {
            React: true,
            JSX: true,
        },
        env: {
            node: true,
        },
        settings: {
            "import/resolver": {
                typescript: {
                    project: resolve(process.cwd(), "tsconfig.json"),
                },
            },
        },
    },
    {
        files: ["*.js?(x)", "*.ts?(x)"],
        extends: ["./base.js"],
    },
];
