import { createAuth } from "../auth";

// Export a static instance for Better Auth schema generation
// biome-ignore lint/suspicious/noExplicitAny: Wrappe
export const auth = createAuth({} as any);
