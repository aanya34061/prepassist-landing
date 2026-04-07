import { Resend } from 'resend';

// Dynamically check if the API key exists
const RESEND_API_KEY = process.env.RESEND_API_KEY;

// Export a singleton instance if the key exists, else null
export const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

/**
 * Universal helper function to send emails safely across the application
 * @param to - Recipient email address
 * @param subject - Email Subject Line
 * @param html - HTML string payload for the email body
 * @returns boolean indicating success or failure status
 */
export async function sendPlatformEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!resend) {
    console.warn(`[RESEND MOCK] Email bypassed locally (No RESEND_API_KEY detected).`);
    console.warn(`[RESEND MOCK] To: ${to} | Subject: ${subject}`);
    return true; // Simulate success locally to prevent breaking UI flows
  }

  try {
    const data = await resend.emails.send({
      from: 'PrepAssist <onboarding@resend.dev>', // Change to your verified Resend Domain later
      to: [to],
      subject: subject,
      html: html,
    });

    if (data.error) {
       console.error("Resend API Failure:", data.error);
       return false;
    }

    return true;
  } catch (error) {
    console.error("Resend Engine Exception:", error);
    return false;
  }
}
