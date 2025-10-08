// Banco de dados para navegador usando IndexedDB
const DB_NAME = 'WhatsAppDB';
const DB_VERSION = 1;

interface Instance {
  id?: number;
  instance_name: string;
  instance_id?: string;
  status: string;
  qr_code?: string;
  phone_number?: string;
  profile_name?: string;
  profile_picture_url?: string;
  created_at: string;
  updated_at: string;
}

interface Contact {
  id?: number;
  instance_id: number;
  name: string;
  number: string;
  status: string;
  created_at: string;
}

interface Message {
  id?: number;
  instance_id: number;
  contact_id: number;
  message: string;
  type: string;
  direction: string;
  created_at: string;
}

class BrowserDatabase {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Criar tabela de instâncias
        if (!db.objectStoreNames.contains('instances')) {
          const instanceStore = db.createObjectStore('instances', { keyPath: 'id', autoIncrement: true });
          instanceStore.createIndex('instance_name', 'instance_name', { unique: true });
        }

        // Criar tabela de contatos
        if (!db.objectStoreNames.contains('contacts')) {
          const contactStore = db.createObjectStore('contacts', { keyPath: 'id', autoIncrement: true });
          contactStore.createIndex('instance_id', 'instance_id');
          contactStore.createIndex('number', 'number');
        }

        // Criar tabela de mensagens
        if (!db.objectStoreNames.contains('messages')) {
          const messageStore = db.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
          messageStore.createIndex('instance_id', 'instance_id');
          messageStore.createIndex('contact_id', 'contact_id');
        }
      };
    });
  }

  private async ensureDb(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    return this.db!;
  }

  // Operações de instância
  async upsertInstance(data: Partial<Instance>): Promise<Instance> {
    const db = await this.ensureDb();
    const transaction = db.transaction(['instances'], 'readwrite');
    const store = transaction.objectStore('instances');

    return new Promise((resolve, reject) => {
      // Primeiro, tentar encontrar instância existente
      const index = store.index('instance_name');
      const getRequest = index.get(data.instance_name!);

      getRequest.onsuccess = () => {
        const existing = getRequest.result;
        const now = new Date().toISOString();

        const instanceData: Instance = {
          instance_name: data.instance_name!,
          instance_id: data.instance_id,
          status: data.status || 'disconnected',
          qr_code: data.qr_code,
          phone_number: data.phone_number,
          profile_name: data.profile_name,
          profile_picture_url: data.profile_picture_url,
          created_at: existing?.created_at || now,
          updated_at: now,
          ...(existing && { id: existing.id })
        };

        const putRequest = store.put(instanceData);
        putRequest.onsuccess = () => resolve({ ...instanceData, id: (existing?.id || putRequest.result) as number });
        putRequest.onerror = () => reject(putRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async findInstanceByName(instanceName: string): Promise<Instance | null> {
    const db = await this.ensureDb();
    const transaction = db.transaction(['instances'], 'readonly');
    const store = transaction.objectStore('instances');
    const index = store.index('instance_name');

    return new Promise((resolve, reject) => {
      const request = index.get(instanceName);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async findAllInstances(): Promise<Instance[]> {
    const db = await this.ensureDb();
    const transaction = db.transaction(['instances'], 'readonly');
    const store = transaction.objectStore('instances');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateInstanceStatus(instanceName: string, status: string): Promise<void> {
    const instance = await this.findInstanceByName(instanceName);
    if (instance) {
      await this.upsertInstance({
        instance_name: instance.instance_name,
        instance_id: instance.instance_id,
        status,
        qr_code: instance.qr_code,
        phone_number: instance.phone_number,
        profile_name: instance.profile_name,
        profile_picture_url: instance.profile_picture_url
      });
    }
  }

  // Operações de contato
  async addContact(instanceId: number, name: string, number: string, status: string): Promise<Contact> {
    const db = await this.ensureDb();
    const transaction = db.transaction(['contacts'], 'readwrite');
    const store = transaction.objectStore('contacts');

    const contactData: Contact = {
      instance_id: instanceId,
      name,
      number,
      status,
      created_at: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const request = store.add(contactData);
      request.onsuccess = () => resolve({ ...contactData, id: request.result as number });
      request.onerror = () => reject(request.error);
    });
  }

  async findContactsByInstance(instanceId: number): Promise<Contact[]> {
    const db = await this.ensureDb();
    const transaction = db.transaction(['contacts'], 'readonly');
    const store = transaction.objectStore('contacts');
    const index = store.index('instance_id');

    return new Promise((resolve, reject) => {
      const request = index.getAll(instanceId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async findAllContacts(): Promise<Contact[]> {
    const db = await this.ensureDb();
    const transaction = db.transaction(['contacts'], 'readonly');
    const store = transaction.objectStore('contacts');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Operações de mensagem
  async addMessage(instanceId: number, contactId: number, message: string, type: string, direction: string): Promise<Message> {
    const db = await this.ensureDb();
    const transaction = db.transaction(['messages'], 'readwrite');
    const store = transaction.objectStore('messages');

    const messageData: Message = {
      instance_id: instanceId,
      contact_id: contactId,
      message,
      type,
      direction,
      created_at: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const request = store.add(messageData);
      request.onsuccess = () => resolve({ ...messageData, id: request.result as number });
      request.onerror = () => reject(request.error);
    });
  }

  async findMessagesByContact(contactId: number): Promise<Message[]> {
    const db = await this.ensureDb();
    const transaction = db.transaction(['messages'], 'readonly');
    const store = transaction.objectStore('messages');
    const index = store.index('contact_id');

    return new Promise((resolve, reject) => {
      const request = index.getAll(contactId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

// Instância singleton
const browserDb = new BrowserDatabase();

// Inicializar automaticamente
browserDb.init().catch(console.error);

// Exportar interfaces para compatibilidade
export const instanceDb = {
  upsert: (data: { instanceName: string; instanceId?: string; status: string; qrCode?: string }) => 
    browserDb.upsertInstance({
      instance_name: data.instanceName,
      instance_id: data.instanceId,
      status: data.status,
      qr_code: data.qrCode
    }),
  findByName: (name: string) => browserDb.findInstanceByName(name),
  findAll: () => browserDb.findAllInstances(),
  updateStatus: (name: string, status: string) => browserDb.updateInstanceStatus(name, status)
};

export const contactDb = {
  add: (instanceId: number, name: string, number: string, status: string) => 
    browserDb.addContact(instanceId, name, number, status),
  findByInstance: (instanceId: number) => browserDb.findContactsByInstance(instanceId),
  findAll: () => browserDb.findAllContacts()
};

export const messageDb = {
  add: (instanceId: number, contactId: number, message: string, type: string, direction: string) => 
    browserDb.addMessage(instanceId, contactId, message, type, direction),
  findByContact: (contactId: number) => browserDb.findMessagesByContact(contactId)
};

export default browserDb;