import { EVO_BASE_URL } from "./config.ts";

export async function getEvolutionContacts(instanceName: string, apiKey: string) {
  try {
    const url = `${EVO_BASE_URL}/chat/getChats/${instanceName}`;
    console.log('Fetching contacts from:', url);
    
    const res = await fetch(url, {
      headers: { apikey: apiKey },
    });
    
    if (!res.ok) {
      console.error('Failed to fetch contacts:', res.status, res.statusText);
      throw new Error(`Failed to fetch contacts: ${res.status}`);
    }
    
    const data = await res.json();
    console.log('Contacts fetched successfully:', data);
    return data;
  } catch (error) {
    console.error('Error in getEvolutionContacts:', error);
    throw error;
  }
}