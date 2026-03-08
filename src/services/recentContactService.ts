import AsyncStorage from '@react-native-async-storage/async-storage';
import { PermissionsAndroid, Platform } from 'react-native';
import Contacts from 'react-native-contacts';
import CallLog from 'react-native-call-log';

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

  async getRecentContacts(limit: number = 8): Promise<RecentContactEntry[]> {
    try {
      // 1. First choice: Actual Recent Call Logs (Top 5 Unique from Phone)
      const callLogContacts = await this.getRecentCalls(5);

      // 2. Second choice: App tracked contacts (if call log is empty)
      const appContacts = await this.getAll();

      // 3. Merge them, prioritizing call log
      const merged = [...callLogContacts];
      const existingPhones = new Set(merged.map(c => this.normalizePhone(c.phoneNumber)));

      for (const appContact of appContacts) {
        if (merged.length >= limit) break;
        const norm = this.normalizePhone(appContact.phoneNumber);
        if (!existingPhones.has(norm)) {
          merged.push(appContact);
          existingPhones.add(norm);
        }
      }

      // 4. Fill with general contacts if still under limit
      if (merged.length < limit) {
        const remaining = limit - merged.length;
        const systemContacts = await this.getSystemContacts(remaining);
        for (const sysContact of systemContacts) {
          if (merged.length >= limit) break;
          const norm = this.normalizePhone(sysContact.phoneNumber);
          if (!existingPhones.has(norm)) {
            merged.push(sysContact);
            existingPhones.add(norm);
          }
        }
      }

      return merged.slice(0, limit);
    } catch (error) {
      console.error('Error merging recent contacts:', error);
      return this.getAll().then(all => all.slice(0, limit));
    }
  }

  private async getRecentCalls(limit: number): Promise<RecentContactEntry[]> {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CALL_LOG
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn('Call log permission denied');
          return [];
        }
      } else {
        // iOS doesn't allow reading call logs directly
        return [];
      }

      // Fetch all call logs
      const calls = await CallLog.loadAll();
      if (!calls || calls.length === 0) return [];

      const uniqueCalls: RecentContactEntry[] = [];
      const seenPhones = new Set<string>();

      for (const call of calls) {
        if (uniqueCalls.length >= limit) break;

        const normalized = this.normalizePhone(call.phoneNumber);
        if (!normalized || seenPhones.has(normalized)) continue;

        seenPhones.add(normalized);
        uniqueCalls.push({
          id: `call_${call.timestamp}_${normalized}`,
          name: call.name || 'Unknown',
          phoneNumber: call.phoneNumber,
          lastContactedAt: new Date(parseInt(call.timestamp)).toISOString(),
        });
      }

      return uniqueCalls;
    } catch (error) {
      console.error('Error fetching call logs:', error);
      return [];
    }
  }

  private async getSystemContacts(limit: number): Promise<RecentContactEntry[]> {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          return [];
        }
      }

      const contacts = await Contacts.getAll();
      return contacts
        .filter(c => c.phoneNumbers && c.phoneNumbers.length > 0)
        .slice(0, limit)
        .map(contact => ({
          id: contact.recordID,
          name: `${contact.givenName} ${contact.familyName}`.trim() || 'No Name',
          phoneNumber: contact.phoneNumbers[0].number,
          contactImage: contact.thumbnailPath || undefined,
          lastContactedAt: new Date().toISOString(),
        }));
    } catch (error) {
      return [];
    }
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
