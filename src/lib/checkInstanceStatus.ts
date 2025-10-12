import { EVO_BASE_URL } from './config';

export async function checkInstanceStatus(instanceName: string, apiKey: string) {
  const res = await fetch(`${EVO_BASE_URL}/instance/connectionState/${instanceName}`, {
    headers: { apikey: apiKey },
  });
  return res.json();
}