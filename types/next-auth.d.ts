import "next-auth";

declare module "next-auth" {
  interface User {
    role: "admin" | "officer";
  }

  interface Session {
    user: {
      id: string;
      role: "admin" | "officer";
      name?: string | null;
      email?: string | null;
    };
  }
}
