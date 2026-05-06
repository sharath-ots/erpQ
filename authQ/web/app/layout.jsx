import { AntdRegistry } from "@ant-design/nextjs-registry";
import "./globals.css";

export const metadata = {
  title: "CityQ — Sign in",
  description: "Authentication",
};

/**
 * NEXT_PUBLIC_* in client components is baked at `next build` into JS chunks.
 * AUTH_WEB_RUNTIME_* is loaded via /runtime-config at request time and injected so
 * login works with the correct apiGate/comdash/auth URLs per deployment.
 */
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script src="/runtime-config" />
      </head>
      <body className="min-h-screen bg-slate-100">
        <AntdRegistry>{children}</AntdRegistry>
      </body>
    </html>
  );
}
