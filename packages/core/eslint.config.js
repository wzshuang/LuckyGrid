/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ["src/**/*.{ts,js}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "vue",
              message: "@luckygrid/core must stay framework-agnostic. Do not import vue.",
            },
          ],
          patterns: [
            {
              group: ["vue/*", "@vue/*"],
              message: "@luckygrid/core must stay framework-agnostic. Do not import vue.",
            },
          ],
        },
      ],
    },
  },
];
