import { apiService } from './apiService';

export interface EmergencyContact {
  _id?: string;
  name: string;
  phoneNumber: string;
  email?: string;
  relationship: 'family' | 'friend' | 'colleague' | 'neighbor' | 'other';
  isPrimary: boolean;
  isActive: boolean;
  addedFrom: 'contact_book' | 'manual' | 'imported';
  contactImage?: string;
  notes?: string;
  emergencyPriority: number;
  lastContacted?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmergencyContactResponse {
  success: boolean;
  data: EmergencyContact | EmergencyContact[] | {
    contacts: EmergencyContact[];
    pagination?: {
      current: number;
      pages: number;
      total: number;
    };
  };
  message?: string;
  pagination?: {
    current: number;
    pages: number;
    total: number;
  };
}

export interface BulkImportResponse {
  success: boolean;
  message: string;
  data: {
    imported: EmergencyContact[];
    errors: Array<{
      index: number;
      phoneNumber: string;
      message: string;
    }>;
  };
}

class EmergencyContactService {
  private baseUrl = '/api/emergency-contacts';

  async getEmergencyContacts(params?: {
    page?: number;
    limit?: number;
    search?: string;
    relationship?: string;
  }): Promise<EmergencyContactResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.search) queryParams.append('search', params.search);
      if (params?.relationship) queryParams.append('relationship', params.relationship);

      const url = `${this.baseUrl}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiService.get(url);
      // apiService.get already returns the parsed JSON data directly
      return response;
    } catch (error) {
      console.error('Error fetching emergency contacts:', error);
      throw error;
    }
  }

  async getEmergencyContact(id: string): Promise<EmergencyContactResponse> {
    try {
      const response = await apiService.get(`${this.baseUrl}/${id}`);
      // apiService.get already returns the parsed JSON data directly
      return response;
    } catch (error) {
      console.error('Error fetching emergency contact:', error);
      throw error;
    }
  }

  async createEmergencyContact(contact: Omit<EmergencyContact, '_id' | 'createdAt' | 'updatedAt'>): Promise<EmergencyContactResponse> {
    try {
      console.log('Creating emergency contact with data:', contact);
      const response = await apiService.post(this.baseUrl, contact);
      console.log('API response:', response);
      
      // Backend returns { success: true, data: { ... }, message: '...' }
      if (response && response.success) {
        return response as EmergencyContactResponse;
      }
      
      // If response doesn't have expected structure, create proper response
      return {
        success: true,
        data: response.data || response,
        message: response.message
      };
    } catch (error) {
      console.error('Error creating emergency contact:', error);
      throw error;
    }
  }

  async updateEmergencyContact(id: string, contact: Partial<EmergencyContact>): Promise<EmergencyContactResponse> {
    try {
      const response = await apiService.put(`${this.baseUrl}/${id}`, contact);
      // apiService.put already returns the parsed JSON data directly
      return response;
    } catch (error) {
      console.error('Error updating emergency contact:', error);
      throw error;
    }
  }

  async deleteEmergencyContact(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiService.delete(`${this.baseUrl}/${id}`);
      // apiService.delete already returns the parsed JSON data directly
      return response;
    } catch (error) {
      console.error('Error deleting emergency contact:', error);
      throw error;
    }
  }

  async setPrimaryContact(id: string): Promise<EmergencyContactResponse> {
    try {
      const response = await apiService.put(`${this.baseUrl}/${id}/primary`);
      // apiService.put already returns the parsed JSON data directly
      return response;
    } catch (error) {
      console.error('Error setting primary contact:', error);
      throw error;
    }
  }

  async bulkImportContacts(contacts: Omit<EmergencyContact, '_id' | 'createdAt' | 'updatedAt'>[]): Promise<BulkImportResponse> {
    try {
      const response = await apiService.post(`${this.baseUrl}/bulk-import`, { contacts });
      // apiService.post already returns the parsed JSON data directly
      return response;
    } catch (error) {
      console.error('Error bulk importing contacts:', error);
      throw error;
    }
  }

  async searchContacts(query: string): Promise<EmergencyContactResponse> {
    try {
      const response = await this.getEmergencyContacts({ search: query });
      return response;
    } catch (error) {
      console.error('Error searching contacts:', error);
      throw error;
    }
  }

  async getContactsByRelationship(relationship: string): Promise<EmergencyContactResponse> {
    try {
      const response = await this.getEmergencyContacts({ relationship });
      return response;
    } catch (error) {
      console.error('Error fetching contacts by relationship:', error);
      throw error;
    }
  }

  async getPrimaryContact(): Promise<EmergencyContact | null> {
    try {
      const response = await this.getEmergencyContacts();
      if (response.success && Array.isArray(response.data)) {
        const primaryContact = response.data.find(contact => contact.isPrimary);
        return primaryContact || null;
      }
      return null;
    } catch (error) {
      console.error('Error fetching primary contact:', error);
      return null;
    }
  }

  formatPhoneNumber(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length === 11 && cleaned[0] === '1') {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    
    return phoneNumber;
  }

  validateContact(contact: Partial<EmergencyContact>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!contact.name || contact.name.trim().length === 0) {
      errors.push('Name is required');
    }

    if (!contact.phoneNumber || contact.phoneNumber.trim().length === 0) {
      errors.push('Phone number is required');
    } else {
      const cleaned = contact.phoneNumber.replace(/\D/g, '');
      if (cleaned.length < 10 || cleaned.length > 15) {
        errors.push('Phone number must be between 10-15 digits');
      }
    }

    if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
      errors.push('Invalid email format');
    }

    if (contact.emergencyPriority && (contact.emergencyPriority < 1 || contact.emergencyPriority > 5)) {
      errors.push('Emergency priority must be between 1-5');
    }

    if (contact.notes && contact.notes.length > 500) {
      errors.push('Notes must be less than 500 characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default new EmergencyContactService();
