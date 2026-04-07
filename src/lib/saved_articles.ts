export interface SavedWebsite {
  id: string;
  userId: string;
  url: string;
  domain: string;
  title?: string;
  dateAdded: number;
}

export const fetchSavedWebsites = async (userId: string): Promise<SavedWebsite[]> => {
  try {
    const existing: SavedWebsite[] = JSON.parse(localStorage.getItem(`local_saved_websites_${userId}`) || "[]");
    return existing.sort((a, b) => b.dateAdded - a.dateAdded);
  } catch (error) {
    console.error("Local Saved Websites Fetch Error:", error);
    return [];
  }
};

export const addSavedWebsite = async (url: string, userId: string, title?: string): Promise<SavedWebsite> => {
  try {
    const existing: SavedWebsite[] = JSON.parse(localStorage.getItem(`local_saved_websites_${userId}`) || "[]");
    
    let domain = "Unknown Domain";
    try {
      const parsedUrl = new URL(url);
      domain = parsedUrl.hostname.replace('www.', '');
    } catch {
      domain = url.split('/')[0] || "Unknown";
    }

    const newSite: SavedWebsite = {
      id: "site_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      userId,
      url,
      domain,
      title: title || domain,
      dateAdded: Date.now()
    };

    existing.push(newSite);
    localStorage.setItem(`local_saved_websites_${userId}`, JSON.stringify(existing));
    
    return newSite;
  } catch (error) {
    console.error("Local Saved Websites Add Error:", error);
    throw error;
  }
};

export const deleteSavedWebsite = async (id: string, userId: string): Promise<void> => {
  try {
    const existing: SavedWebsite[] = JSON.parse(localStorage.getItem(`local_saved_websites_${userId}`) || "[]");
    const updated = existing.filter((n: SavedWebsite) => n.id !== id);
    localStorage.setItem(`local_saved_websites_${userId}`, JSON.stringify(updated));
  } catch (error) {
    console.error("Local Saved Websites Delete Error:", error);
    throw error;
  }
};
