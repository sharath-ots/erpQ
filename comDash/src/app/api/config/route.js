export const dynamic = "force-dynamic";

/**
 * Returns browser-facing config that can only be known at runtime (Docker env).
 * Avoids baking URLs into the Next.js bundle at build time via NEXT_PUBLIC_*.
 */
export function GET() {
  return Response.json({
    authUrl: process.env.NEXT_PUBLIC_AUTH_URL ?? "http://localhost:3100",
  });
}
