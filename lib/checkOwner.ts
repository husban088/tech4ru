// lib/checkOwner.ts
export const OWNER_EMAIL = "info@tech4ru.com";

export function isOwner(email: string | null | undefined): boolean {
  console.log("🔍 isOwner called with email:", email);

  if (!email) {
    console.log("🔴 isOwner: No email provided, returning false");
    return false;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedOwner = OWNER_EMAIL.toLowerCase();
  const result = normalizedEmail === normalizedOwner;

  console.log(
    `🔍 isOwner Result: ${result} (${normalizedEmail} === ${normalizedOwner})`,
  );

  return result;
}
