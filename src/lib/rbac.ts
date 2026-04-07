export const ADMIN_EMAILS = [
  "admin@prepassist.com",
  "founder@prepassist.com",
  "support@prepassist.com"
];

/**
 * Validates whether an authenticated email belongs to the Administrative Hierarchy
 * dynamically preventing unauthorized student access to dashboard routing.
 */
export const isAdminEmail = (email: string | undefined | null): boolean => {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  
  // Dynamic structural checks targeting Prepassist / UPSCPrep Corporate strings
  if (normalized.endsWith('@prepassist.com') || normalized.endsWith('@upscprep.com')) return true;
  
  return ADMIN_EMAILS.includes(normalized);
};
