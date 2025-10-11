// Database service using localStorage for WhatsApp instances
// This replaces the Supabase dependency for WhatsApp connection management

export interface WhatsAppInstance {
  id: string;
  instance_name: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  qr_code?: string;
  created_at: string;
  updated_at: string;
}

class DatabaseService {
  private readonly STORAGE_KEY = 'whatsapp_instances';

  // Get all instances
  async getInstances(): Promise<WhatsAppInstance[]> {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading instances:', error);
      return [];
    }
  }

  // Get instance by name
  async getInstance(instanceName: string): Promise<WhatsAppInstance | null> {
    const instances = await this.getInstances();
    return instances.find(instance => instance.instance_name === instanceName) || null;
  }

  // Create new instance
  async createInstance(instanceName: string): Promise<WhatsAppInstance> {
    const instances = await this.getInstances();
    
    // Check if instance already exists
    const existingInstance = instances.find(instance => instance.instance_name === instanceName);
    if (existingInstance) {
      throw new Error('Instance already exists');
    }

    const newInstance: WhatsAppInstance = {
      id: crypto.randomUUID(),
      instance_name: instanceName,
      status: 'connecting',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    instances.push(newInstance);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(instances));
    
    return newInstance;
  }

  // Update instance
  async updateInstance(instanceName: string, updates: Partial<WhatsAppInstance>): Promise<WhatsAppInstance> {
    const instances = await this.getInstances();
    const instanceIndex = instances.findIndex(instance => instance.instance_name === instanceName);
    
    if (instanceIndex === -1) {
      throw new Error('Instance not found');
    }

    instances[instanceIndex] = {
      ...instances[instanceIndex],
      ...updates,
      updated_at: new Date().toISOString()
    };

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(instances));
    return instances[instanceIndex];
  }

  // Delete instance
  async deleteInstance(instanceName: string): Promise<void> {
    const instances = await this.getInstances();
    const filteredInstances = instances.filter(instance => instance.instance_name !== instanceName);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredInstances));
  }

  // Clear all instances
  async clearInstances(): Promise<void> {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

export const db = new DatabaseService();