import { PortalClientRoot } from "@/components/portal/PortalClientRoot";
import { Plus_Jakarta_Sans, Spline_Sans_Mono } from "next/font/google";
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import { getServerSession } from 'next-auth';
import { authOptions } from 'lib/next-auth/nextAuthOptions'; // Check this path!
import "./globals.css";

export const dynamic = "force-dynamic";

const plusJakartaSans = Plus_Jakarta_Sans({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

const splineSansMono = Spline_Sans_Mono({
  weight: ["400"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "Q-Portal",
  description: "Central dashboard and module loader",
};

export default async function RootLayout({ children }) {
  const session = await getServerSession(authOptions);

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plusJakartaSans.className} ${splineSansMono.className}`}
    >
      <body>
        {/* MUI Color Scheme Script MUST be right inside body */}
        <InitColorSchemeScript attribute="data-aurora-color-scheme" modeStorageKey="aurora-mode" />
        <PortalClientRoot session={session}>
          {children}
        </PortalClientRoot>
      </body>
    </html>
  );
}