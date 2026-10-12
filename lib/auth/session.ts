import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SESSION_SECRET = process.env.SESSION_SECRET;

if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
   throw new Error(
      "SESSION_SECRET must be configured with at least 32 characters.",
   );
}

const secretKey = new TextEncoder().encode(SESSION_SECRET);

export const SESSION_COOKIE_NAME = "adflow_session";

export type SessionPayload = {
   userId: string;
   username: string;
   email: string;
};

export async function createSessionToken(
   payload: SessionPayload,
   rememberMe: boolean,
): Promise<string> {
   const expiresIn = rememberMe ? "30d" : "12h";

   return new SignJWT({
      username: payload.username,
      email: payload.email,
   })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(payload.userId)
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(secretKey);
}

export async function verifySessionToken(
   token: string,
): Promise<SessionPayload | null> {
   try {
      const { payload } = await jwtVerify(token, secretKey, {
         algorithms: ["HS256"],
      });

      if (
         typeof payload.sub !== "string" ||
         typeof payload.username !== "string" ||
         typeof payload.email !== "string"
      ) {
         return null;
      }

      return {
         userId: payload.sub,
         username: payload.username,
         email: payload.email,
      };
   } catch {
      return null;
   }
}

export async function getSession(): Promise<SessionPayload | null> {
   const cookieStore = await cookies();
   const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

   if (!token) {
      return null;
   }

   return verifySessionToken(token);
}

export function sessionCookieOptions(rememberMe: boolean) {
   return {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      ...(rememberMe ? { maxAge: 60 * 60 * 24 * 30 } : {}),
   };
}
