import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RecentContactEntry {
  id: string;
  name?: string;
  phoneNumber: string;
  contactImage?: string;
  lastContactedAt: string; // ISO string
}

export interface NewRecentContactInput {
  id: string;
  name?: string;
  phoneNumber: string;
  contactImage?: string;
}

const STORAGE_KEY = 'recent_contacts_v1';
const MAX_STORED = 50;

class RecentContactService {
  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  private async getAll(): Promise<RecentContactEntry[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return [];

      const parsed = JSON.parse(raw) as RecentContactEntry[];
      if (!Array.isArray(parsed)) return [];

      return parsed.filter((item) => !!item && !!item.phoneNumber);
    } catch (error) {
      console.error('Error reading recent contacts from storage:', error);
      return [];
    }
  }

  private async saveAll(entries: RecentContactEntry[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (error) {
      console.error('Error saving recent contacts to storage:', error);
    }
  }

  async addRecentContact(input: NewRecentContactInput): Promise<void> {
    const normalizedPhone = this.normalizePhone(input.phoneNumber);
    if (!normalizedPhone) return;

    const now = new Date().toISOString();
    const existing = await this.getAll();

    // Remove any existing entry with same normalized phone
    const filtered = existing.filter(
      (entry) => this.normalizePhone(entry.phoneNumber) !== normalizedPhone
    );

    const newEntry: RecentContactEntry = {
      id: input.id,
      name: input.name,
      phoneNumber: input.phoneNumber,
      contactImage: input.contactImage,
      lastContactedAt: now,
    };

    const updated = [newEntry, ...filtered]
      .sort(
        (a, b) =>
          new Date(b.lastContactedAt).getTime() -
          new Date(a.lastContactedAt).getTime()
      )
      .slice(0, MAX_STORED);

    await this.saveAll(updated);
  }

  async getRecentContacts(limit?: number): Promise<RecentContactEntry[]> {
    const all = await this.getAll();

    const sorted = all.sort(
      (a, b) =>
        new Date(b.lastContactedAt).getTime() -
        new Date(a.lastContactedAt).getTime()
    );

    if (limit && limit > 0) {
      return sorted.slice(0, limit);
    }

    return sorted;
  }

  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing recent contacts from storage:', error);
    }
  }
}

export default new RecentContactService();
