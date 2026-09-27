import { createAuthClient } from "better-auth/react";
import { adminClient, organizationClient } from "better-auth/client/plugins";
import { ac, weddingRoles } from "@/lib/permissions";

export const authClient = createAuthClient({
  plugins: [adminClient(), organizationClient({ ac, roles: weddingRoles })],
});
