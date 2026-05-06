import NextAuth from "next-auth";
import { nextAuthOptions } from "../../../../ui/lib/next-auth/nextAuthOptions";

const handler = NextAuth(nextAuthOptions);

export { handler as GET, handler as POST };