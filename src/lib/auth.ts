import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { getAuthSecondaryStorage } from "@/lib/auth-secondary-storage";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL?.trim() || undefined,
  plugins: [nextCookies()],
  session: {
    storeSessionInDatabase: true,
  },
  user: {
    additionalFields: {
      companyId: {
        type: "string",
        required: false,
        input: true,
      },
      role: {
        type: "string",
        required: false,
        input: true,
      },
      readOnly: {
        type: "boolean",
        required: false,
        input: true,
      },
      canWriteMasterData: {
        type: "boolean",
        required: false,
        input: true,
      },
      canWritePreTour: {
        type: "boolean",
        required: false,
        input: true,
      },
      isActive: {
        type: "boolean",
        required: false,
        input: true,
      },
    },
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { ...schema },
  }),
  secondaryStorage: getAuthSecondaryStorage(),
});
