import { AuthGate } from "@/components/portal/AuthGate";
import { PortalShellLayout } from "@/components/portal/PortalShellLayout";

/**
 * Shared portal layout for / and all /m/* routes.
 * AuthGate + PortalShellLayout are mounted once and NEVER remounted during
 * client-side navigation, so the sidebar and topbar stay in place.
 */
export default function PortalLayout({ children }) {
  return (
    <AuthGate>
      <PortalShellLayout>{children}</PortalShellLayout>
    </AuthGate>
  );
}
