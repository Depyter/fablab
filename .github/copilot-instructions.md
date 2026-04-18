# Copilot Instructions

- Prefer `bun` and `bunx` over `npm`, `npx`, and other package managers when running project commands or one-off tools.
- Before running a project command, check `package.json` to confirm the script exists and use the defined script name instead of guessing.
- When a needed task already has a script in `package.json`, run that script rather than reconstructing the underlying command manually.
- Avoid inline `style` props as much as possible when the same result can be expressed with Tailwind classes, arbitrary values, or theme tokens.
