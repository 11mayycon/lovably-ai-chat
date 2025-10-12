import { EVO_BASE_URL } from './config';

export async function checkInstanceStatus(instanceName: string, apiKey: string) {
  try {
    const url = `${EVO_BASE_URL}/instance/connectionState/${instanceName}`;
    console.log('Checking instance status at:', url);
    
    const res = await fetch(url, {
      headers: { apikey: apiKey },
    });
    
    if (!res.ok) {
      console.error('Failed to check instance status:', res.status, res.statusText);
      throw new Error(`Failed to check instance status: ${res.status}`);
    }
    
    const data = await res.json();
    console.log('Instance status:', data);
    return data;
  } catch (error) {
    console.error('Error in checkInstanceStatus:', error);
    throw error;
  }
}