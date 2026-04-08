import { PortalClientRoot } from "@/components/portal/PortalClientRoot";
import { Plus_Jakarta_Sans, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";

/** JWT + client-only shell: avoid build-time static prerender of Aurora/MUI (fragile with server externals). */
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
  title: "CityQ ERP — Portal",
  description: "Central dashboard and module loader",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plusJakartaSans.className} ${splineSansMono.className}`}
    >
      <body>
        <PortalClientRoot>{children}</PortalClientRoot>
      </body>
    </html>
  );
}
