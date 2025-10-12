import { EVO_BASE_URL } from "./config.ts";

export async function getEvolutionContacts(instanceName: string, apiKey: string) {
  const res = await fetch(`${EVO_BASE_URL}/chat/getChats/${instanceName}`, {
    headers: { apikey: apiKey },
  });
  return res.json();
}