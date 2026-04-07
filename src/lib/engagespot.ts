import { EngagespotClient } from "@engagespot/node";

const ENGAGESPOT_API_KEY = process.env.ENGAGESPOT_API_KEY;
const ENGAGESPOT_API_SECRET = process.env.ENGAGESPOT_API_SECRET;

export const engagespot = (ENGAGESPOT_API_KEY && ENGAGESPOT_API_SECRET) 
  ? EngagespotClient({ apiKey: ENGAGESPOT_API_KEY, apiSecret: ENGAGESPOT_API_SECRET })
  : null;

/**
 * Universal helper to ping Engagespot notifications across the platform
 * @param title - The Notification bold title
 * @param message - The Notification body text
 * @param recipients - Array of User IDs targeting exactly who gets this notification
 * @param actionUrl - (Optional) URL to route the user to when they click it
 */
export async function triggerNotification(title: string, message: string, recipients: string[], actionUrl?: string) {
  if (!engagespot) {
     console.warn(`[ENGAGESPOT MOCK] Notification bypassed locally (Missing API Keys).`);
     console.warn(`[ENGAGESPOT MOCK] To: ${recipients.join(', ')} | Title: ${title}`);
     return true; // Fake success block when keys absent
  }

  try {
     await engagespot.send({
        notification: {
            title: title,
            message: message,
            url: actionUrl
        },
        recipients: recipients,
     });
     return true;
  } catch (error) {
     console.error("Engagespot Routing Failed:", error);
     return false;
  }
}
