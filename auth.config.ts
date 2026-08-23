import type { NextAuthConfig } from "next-auth";

import { publicPaths } from "@/lib/permissions";

export const authConfig = {
  providers: [],
  trustHost: true,
  pages: {
    signIn: "/login"
  },
  callbacks: {
    authorized: async ({ auth: session, request }) => {
      const pathname = request.nextUrl.pathname;
      const isPublic = publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));

      if (!session?.user && !isPublic) {
        return false;
      }

      if (session?.user && pathname === "/login") {
        return Response.redirect(new URL("/citations", request.nextUrl));
      }

      return true;
    }
  }
} satisfies NextAuthConfig;
