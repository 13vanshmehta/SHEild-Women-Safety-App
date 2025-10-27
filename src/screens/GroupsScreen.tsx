import React, { useState, useEffect, useCallback } from 'react';
import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Clipboard from '@react-native-clipboard/clipboard';
import { Colors } from '../constants';
import emergencyContactService, { EmergencyContact } from '../services/emergencyContactService';
import ContactSelectionScreen from './ContactSelectionScreen';
import { apiService } from '../services/apiService';
import SlideView from '../components/SlideView';

// Create Group Modal Component
const CreateGroupModal: React.FC<{ 
  visible: boolean; 
  onClose: () => void; 
  onSuccess: () => void;
  setSuccessModal: (modal: any) => void;
  shareJoinCode: (code: string, name: string) => void;
  showToast: (message: string, type: 'success' | 'error') => void;
}> = ({ visible, onClose, onSuccess: _onSuccess, setSuccessModal, shareJoinCode: _shareJoinCode }) => {
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    try {
      setLoading(true);
      console.log('Creating group with:', { name: groupName, description });
      const response = await apiService.post('/api/groups', {
        name: groupName.trim(),
        description: description.trim() || '',
      });
      console.log('Group creation response:', response);

      if (response && response.success) {
        const joinCode = response.data?.joinCode;
        const createdGroupName = response.data?.name || groupName;
        setGroupName('');
        setDescription('');
        
        // Show custom success modal
        setSuccessModal({
          visible: true,
          title: '🎉 Group Created!',
          message: `Your group "${createdGroupName}" has been created successfully!`,
          joinCode: joinCode,
          groupName: createdGroupName,
        });
      } else {
        Alert.alert('Error', response?.message || 'Failed to create group');
      }
    } catch (error: any) {
      console.error('Error creating group:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to create group';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.groupModalContent}>
          <View style={styles.groupModalHeader}>
            <Text style={styles.groupModalTitle}>Create New Group</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.groupModalLabel}>Group Name *</Text>
          <TextInput
            style={styles.groupModalInput}
            placeholder="Enter group name"
            placeholderTextColor={Colors.textLight}
            value={groupName}
            onChangeText={setGroupName}
            editable={!loading}
          />

          <Text style={styles.groupModalLabel}>Description (Optional)</Text>
          <TextInput
            style={[styles.groupModalInput, styles.groupModalTextArea]}
            placeholder="Enter group description"
            placeholderTextColor={Colors.textLight}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            editable={!loading}
          />

          <View style={styles.groupModalButtons}>
            <TouchableOpacity
              style={[styles.groupModalButton, styles.groupModalButtonSecondary]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.groupModalButtonTextSecondary}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.groupModalButton, styles.groupModalButtonPrimary]}
              onPress={handleCreate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.background} />
              ) : (
                <Text style={styles.groupModalButtonTextPrimary}>Create Group</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Join Group Modal Component
const JoinGroupModal: React.FC<{ 
  visible: boolean; 
  onClose: () => void; 
  onSuccess: () => void;
  showToast: (message: string, type: 'success' | 'error') => void;
}> = ({ visible, onClose, onSuccess }) => {
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!joinCode.trim()) {
      Alert.alert('Error', 'Please enter a join code');
      return;
    }

    try {
      setLoading(true);
      console.log('Joining group with code:', joinCode.toUpperCase());
      const response = await apiService.post('/api/groups/join', {
        joinCode: joinCode.toUpperCase().replace(/[^A-Z0-9-]/g, ''),
      });
      console.log('Join group response:', response);

      if (response && response.success) {
        setJoinCode('');
        onSuccess();
      } else {
        Alert.alert('Error', response?.message || 'Invalid join code');
      }
    } catch (error: any) {
      console.error('Error joining group:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to join group';
      Alert.alert('Unable to Join', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.groupModalContent}>
          <View style={styles.groupModalHeader}>
            <Text style={styles.groupModalTitle}>Join Group</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.groupModalLabel}>Enter Join Code</Text>
          <TextInput
            style={styles.groupModalInput}
            placeholder="XXXX-XXXX-XXXX"
            placeholderTextColor={Colors.textLight}
            value={joinCode}
            onChangeText={(text) => setJoinCode(text.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
            autoCapitalize="characters"
            editable={!loading}
          />

          <Text style={styles.groupModalHint}>
            Ask the group admin for the join code
          </Text>

          <View style={styles.groupModalButtons}>
            <TouchableOpacity
              style={[styles.groupModalButton, styles.groupModalButtonSecondary]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.groupModalButtonTextSecondary}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.groupModalButton, styles.groupModalButtonPrimary]}
              onPress={handleJoin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.background} />
              ) : (
                <Text style={styles.groupModalButtonTextPrimary}>Join Group</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Group Chat Screen Component
const GroupChatScreen: React.FC<{ group: any; onBack: () => void }> = ({ group, onBack }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      // Mock messages for now - replace with real API call
      const mockMessages = [
        {
          _id: '1',
          text: 'Good morning! How are all?',
          sender: { name: 'You', _id: 'user1' },
          timestamp: new Date().toISOString(),
          isOwn: true,
        },
        {
          _id: '2',
          text: 'I am good.how about you?',
          sender: { name: 'John', _id: 'user2' },
          timestamp: new Date().toISOString(),
          isOwn: false,
        },
        {
          _id: '3',
          text: 'Fine!',
          sender: { name: 'You', _id: 'user1' },
          timestamp: new Date().toISOString(),
          isOwn: true,
        },
        {
          _id: '4',
          text: "That's good",
          sender: { name: 'Sarah', _id: 'user3' },
          timestamp: new Date().toISOString(),
          isOwn: false,
        },
        {
          _id: '5',
          text: 'Can we make a short tour mates?',
          sender: { name: 'You', _id: 'user1' },
          timestamp: new Date().toISOString(),
          isOwn: true,
        },
        {
          _id: '6',
          text: "what's the opinion of all our other housemates?",
          sender: { name: 'You', _id: 'user1' },
          timestamp: new Date().toISOString(),
          isOwn: true,
        },
        {
          _id: '7',
          text: 'I am also agree with you.',
          sender: { name: 'Mike', _id: 'user4' },
          timestamp: new Date().toISOString(),
          isOwn: false,
        },
      ];
      setMessages(mockMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const message = {
      _id: Date.now().toString(),
      text: newMessage.trim(),
      sender: { name: 'You', _id: 'user1' },
      timestamp: new Date().toISOString(),
      isOwn: true,
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // Here you would send the message to your API
    try {
      // await apiService.post(`/api/groups/${group._id}/messages`, { text: message.text });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <SafeAreaView style={styles.chatContainer}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />
      
      {/* Chat Header */}
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.chatHeaderInfo}>
          <Text style={styles.chatGroupName}>{group.name}</Text>
          <Text style={styles.chatGroupMembers}>{group.memberCount || '4'} members</Text>
        </View>
        <View style={styles.chatHeaderActions}>
          <TouchableOpacity style={styles.chatActionButton}>
            <Icon name="phone" size={20} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.chatActionButton}>
            <Icon name="video" size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <ScrollView 
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          messages.map((message) => (
            <View 
              key={message._id} 
              style={[
                styles.messageContainer,
                message.isOwn ? styles.ownMessageContainer : styles.otherMessageContainer
              ]}
            >
              {!message.isOwn && (
                <View style={styles.messageAvatar}>
                  <Text style={styles.messageAvatarText}>
                    {message.sender.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={[
                styles.messageBubble,
                message.isOwn ? styles.ownMessageBubble : styles.otherMessageBubble
              ]}>
                <Text style={[
                  styles.messageText,
                  message.isOwn ? styles.ownMessageText : styles.otherMessageText
                ]}>
                  {message.text}
                </Text>
                <Text style={[
                  styles.messageTime,
                  message.isOwn ? styles.ownMessageTime : styles.otherMessageTime
                ]}>
                  {formatTime(message.timestamp)}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Message Input */}
      <View style={styles.messageInputContainer}>
        <TouchableOpacity style={styles.messageInputButton}>
          <Icon name="plus" size={20} color={Colors.textLight} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.messageInputButton}>
          <Icon name="image" size={20} color={Colors.textLight} />
        </TouchableOpacity>
        <TextInput
          style={styles.messageInput}
          placeholder="Type a message..."
          placeholderTextColor={Colors.textLight}
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
        />
        <TouchableOpacity 
          style={styles.sendButton}
          onPress={sendMessage}
          disabled={!newMessage.trim()}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const GroupsScreen: React.FC<{ onChatStateChange?: (isOpen: boolean) => void }> = ({ onChatStateChange }) => {
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showContactSelection, setShowContactSelection] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({ visible: false, message: '', type: 'success' });
  const [successModal, setSuccessModal] = useState<{ visible: boolean; title: string; message: string; joinCode?: string; groupName?: string }>({ visible: false, title: '', message: '' });
  const [activeTab, setActiveTab] = useState<'groups' | 'emergency'>('groups');
  const [currentScreen, setCurrentScreen] = useState<'main' | 'chat'>('main');
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  
  const [tabIndex, setTabIndex] = useState(0);

  const loadEmergencyContacts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await emergencyContactService.getEmergencyContacts();
      
      if (response && response.success) {
        // Handle paginated response structure from backend
        if (response.data && typeof response.data === 'object' && 'contacts' in response.data) {
          // Backend returns { data: { contacts: [...], pagination: {...} } }
          const contacts = (response.data as any).contacts;
          setEmergencyContacts(Array.isArray(contacts) ? contacts : []);
        } else if (Array.isArray(response.data)) {
          // Direct array response
          setEmergencyContacts(response.data);
        } else {
          // No contacts - normal empty state
          setEmergencyContacts([]);
        }
      } else {
        // If response is not successful, check if it's a genuine error
        // Only show error if there's a message indicating a real problem
        if (response && response.message && response.message !== 'No contacts found') {
          console.error('Failed to load emergency contacts:', response.message);
          // For now, just set empty array - user can retry if needed
          setEmergencyContacts([]);
        } else {
          // Normal empty state, no contacts yet
          setEmergencyContacts([]);
        }
      }
    } catch (error: any) {
      console.error('Error loading emergency contacts:', error);
      
      // Only log detailed error info, don't show alert
      // This prevents showing error alerts when user has no contacts yet
      // or when it's a network/server issue (which is expected during development)
      setEmergencyContacts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadGroups = useCallback(async () => {
    try {
      console.log('Loading groups...');
      const response = await apiService.get('/api/groups');
      console.log('Groups response:', response);
      
      if (response && response.success && response.data) {
        // Backend returns { success: true, data: { groups: [...], pagination: {...} } }
        const groupsList = response.data.groups || [];
        console.log('Groups list:', groupsList);
        setGroups(Array.isArray(groupsList) ? groupsList : []);
      } else {
        setGroups([]);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
      setGroups([]);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadEmergencyContacts(), loadGroups()]);
    setRefreshing(false);
  }, [loadEmergencyContacts, loadGroups]);

  useEffect(() => {
    loadEmergencyContacts();
    loadGroups();
  }, [loadEmergencyContacts, loadGroups]);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast({ visible: false, message: '', type: 'success' });
    }, 3000);
  }, []);

  const shareGroupCode = useCallback((code: string, name: string) => {
    const shareMessage = `Join my group "${name}" on SHEild!\n\nJoin Code: ${code}\n\nUse this code to join my group and stay safe together!`;
    
    Share.share({
      message: shareMessage,
      title: 'Join my SHEild Group',
    }).then(() => {
      showToast('Share initiated!', 'success');
    }).catch(() => {
      // User canceled
    });
  }, [showToast]);


  const handleAddFromContacts = () => {
    setShowAddModal(false);
    setShowContactSelection(true);
  };

  const handleCreateGroup = () => {
    setShowAddModal(false);
    setShowCreateGroup(true);
  };

  const handleJoinGroup = () => {
    setShowAddModal(false);
    setShowJoinGroup(true);
  };

  const handleCreateGroupPress = () => {
    setShowAddModal(true);
  };

  const handleTabSwitch = (tab: 'groups' | 'emergency') => {
    setActiveTab(tab);
    setTabIndex(tab === 'groups' ? 0 : 1);
  };

  const handleGroupPress = (group: any) => {
    setSelectedGroup(group);
    setCurrentScreen('chat');
    onChatStateChange?.(true);
  };

  const handleBackToMain = () => {
    setCurrentScreen('main');
    setSelectedGroup(null);
    onChatStateChange?.(false);
  };


  const handleContactSelected = async (contact: EmergencyContact) => {
    console.log('handleContactSelected called with contact:', contact);
    setShowContactSelection(false);
    console.log('Loading emergency contacts to refresh...');
    
    // Refresh the list after adding a contact
    try {
      await loadEmergencyContacts();
      console.log('Emergency contacts refreshed successfully');
    } catch (error) {
      console.error('Error refreshing contacts:', error);
      // Silently fail - user can manually refresh if needed
    }
  };



  const renderAddModal = () => (
    <Modal
      visible={showAddModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowAddModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add to Trust Circle</Text>
          
          <TouchableOpacity style={styles.modalOption} onPress={handleAddFromContacts}>
            <Icon name="account-plus" size={24} color={Colors.primary} />
            <View style={styles.modalOptionText}>
              <Text style={styles.modalOptionTitle}>Add Emergency Contact</Text>
              <Text style={styles.modalOptionSubtitle}>Select from your contact book</Text>
            </View>
            <Icon name="chevron-right" size={20} color={Colors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.modalOption} onPress={handleCreateGroup}>
            <Icon name="account-group-plus" size={24} color={Colors.primary} />
            <View style={styles.modalOptionText}>
              <Text style={styles.modalOptionTitle}>Create Group</Text>
              <Text style={styles.modalOptionSubtitle}>Create a new group chat</Text>
            </View>
            <Icon name="chevron-right" size={20} color={Colors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.modalOption} onPress={handleJoinGroup}>
            <Icon name="account-group" size={24} color={Colors.primary} />
            <View style={styles.modalOptionText}>
              <Text style={styles.modalOptionTitle}>Join Group</Text>
              <Text style={styles.modalOptionSubtitle}>Join group with code</Text>
            </View>
            <Icon name="chevron-right" size={20} color={Colors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modalCancelButton}
            onPress={() => setShowAddModal(false)}
          >
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // If we're in chat screen, render the chat component
  if (currentScreen === 'chat' && selectedGroup) {
    return (
      <GroupChatScreen
        group={selectedGroup}
        onBack={handleBackToMain}
      />
    );
  }

  // Otherwise render the main screen
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={Colors.background} barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trust Circle</Text>
        <View style={styles.headerActions}>
          <View style={styles.headerSearchContainer}>
        <Icon name="magnify" size={20} color={Colors.textLight} />
        <TextInput
              style={styles.headerSearchInput}
              placeholder="Search..."
          placeholderTextColor={Colors.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={20} color={Colors.textLight} />
          </TouchableOpacity>
        )}
          </View>
          <TouchableOpacity onPress={handleCreateGroupPress}>
            <Icon name="plus-circle" size={32} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'groups' && styles.activeTab]} 
          onPress={() => handleTabSwitch('groups')}
        >
          <Text style={[styles.tabText, activeTab === 'groups' && styles.activeTabText]}>Groups</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'emergency' && styles.activeTab]} 
          onPress={() => handleTabSwitch('emergency')}
        >
          <Text style={[styles.tabText, activeTab === 'emergency' && styles.activeTabText]}>Emergency Contact</Text>
        </TouchableOpacity>
      </View>

      <SlideView currentIndex={tabIndex} onIndexChange={setTabIndex} style={styles.slideViewContainer}>
          {/* Groups Tab Content */}
          <ScrollView 
            style={[styles.scrollView, { width: SCREEN_WIDTH }]} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
          />
        }
      >
            <View style={styles.groupListContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading groups...</Text>
            </View>
            ) : groups.length > 0 ? (
              groups.map((group) => {
                const avatarColors = ['#546E7A', '#5C6BC0', '#7E57C2', '#42A5F5', '#26A69A', '#66BB6A', '#FFA726', '#EF5350'];
                const avatarColor = avatarColors[group.name?.charCodeAt(0) % avatarColors.length || 0];
                const unreadCount = Math.floor(Math.random() * 5); // Mock unread count
                
                return (
                  <TouchableOpacity 
                    key={group._id} 
                    style={styles.groupListItem}
                    onPress={() => handleGroupPress(group)}
                  >
                    {/* Group Avatar */}
                  <View style={styles.groupAvatarContainer}>
                    <View style={[styles.groupAvatar, { backgroundColor: avatarColor }]}>
                      <Text style={styles.groupAvatarText}>
                        {group.name?.substring(0, 2).toUpperCase() || 'GP'}
                      </Text>
                    </View>
                  </View>
                
                {/* Group Info */}
                    <View style={styles.groupInfo}>
                  <View style={styles.groupHeader}>
                    <Text style={styles.groupName} numberOfLines={1}>
                      {group.name}
                    </Text>
                      <Text style={styles.groupTime}>
                          {group.createdAt ? new Date(group.createdAt).toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit',
                            hour12: false 
                          }) : '23 mins'}
                      </Text>
                  </View>
                  
                  <View style={styles.groupSubtitle}>
                      <Text style={styles.groupLastMessage} numberOfLines={1}>
                          {group.lastMessage || group.description || 'Join Code: ' + group.joinCode}
                      </Text>
                        {unreadCount > 0 && (
                          <View style={styles.unreadBadge}>
                            <Text style={styles.unreadText}>{unreadCount}</Text>
                          </View>
                        )}
                    </View>
                  </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <Icon name="account-group" size={48} color="#9CA3AF" />
                <Text style={styles.emptyStateTitle}>No groups yet</Text>
                <Text style={styles.emptyStateMessage}>
                  Create your first group to start chatting with friends
                      </Text>
                <TouchableOpacity
                  style={styles.emptyStateButton}
                  onPress={handleCreateGroupPress}
                >
                  <Icon name="plus" size={20} color="#FFFFFF" />
                  <Text style={styles.emptyStateButtonText}>Create Group</Text>
                </TouchableOpacity>
          </View>
        )}
          </View>
        </ScrollView>

          {/* Emergency Contact Tab Content */}
          <ScrollView 
            style={[styles.scrollView]} 
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[Colors.primary]}
              />
            }
          >
            <View style={styles.emergencyListContainer}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.loadingText}>Loading contacts...</Text>
                </View>
              ) : emergencyContacts.length > 0 ? (
                emergencyContacts.map((contact) => {
                const avatarColors = ['#546E7A', '#5C6BC0', '#7E57C2', '#42A5F5', '#26A69A', '#66BB6A', '#FFA726', '#EF5350'];
                const avatarColor = avatarColors[contact.name?.charCodeAt(0) % avatarColors.length || 0];
                
                return (
                  <TouchableOpacity key={contact._id} style={styles.contactListItem}>
                    {/* Contact Avatar */}
                    <View style={styles.contactAvatarContainer}>
                      <View style={[styles.contactAvatar, { backgroundColor: avatarColor }]}>
                        <Text style={styles.contactAvatarText}>
                          {contact.name?.charAt(0).toUpperCase() || 'U'}
                        </Text>
                  </View>
                </View>
                
                    {/* Contact Info */}
                    <View style={styles.contactInfo}>
                      <View style={styles.contactHeader}>
                        <Text style={styles.contactName} numberOfLines={1}>
                          {contact.name}
                        </Text>
                        {contact.isPrimary && (
                          <View style={styles.primaryBadge}>
                            <Icon name="star" size={12} color="#FFD700" />
                            <Text style={styles.primaryText}>Primary</Text>
                          </View>
                        )}
                      </View>
                      
                      <View style={styles.contactSubtitle}>
                        <Text style={styles.contactLastMessage} numberOfLines={1}>
                          {contact.relationship.charAt(0).toUpperCase() + contact.relationship.slice(1)} • {emergencyContactService.formatPhoneNumber(contact.phoneNumber)}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <Icon name="account-search" size={48} color={Colors.textLight} />
                <Text style={styles.emptyStateTitle}>No emergency contacts</Text>
                <Text style={styles.emptyStateMessage}>
                  Add your first emergency contact to get started
                </Text>
                <TouchableOpacity
                  style={styles.emptyStateButton}
                  onPress={() => setShowAddModal(true)}
                >
                  <Icon name="plus" size={20} color="#FFFFFF" />
                  <Text style={styles.emptyStateButtonText}>Add Contact</Text>
                </TouchableOpacity>
            </View>
            )}
          </View>
        </ScrollView>
        
        {/* Emergency Contact Tab Content */}
        <ScrollView 
          style={[styles.scrollView, { width: SCREEN_WIDTH }]} 
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
            />
          }
        >
          <View style={styles.emergencyListContainer}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading contacts...</Text>
              </View>
            ) : emergencyContacts.length > 0 ? (
              emergencyContacts.map((contact) => {
                const avatarColors = ['#546E7A', '#5C6BC0', '#7E57C2', '#42A5F5', '#26A69A', '#66BB6A', '#FFA726', '#EF5350'];
                const avatarColor = avatarColors[contact.name?.charCodeAt(0) % avatarColors.length || 0];
                
                return (
                  <TouchableOpacity key={contact._id} style={styles.contactListItem}>
                    {/* Contact Avatar */}
                    <View style={styles.contactAvatarContainer}>
                      <View style={[styles.contactAvatar, { backgroundColor: avatarColor }]}>
                        <Text style={styles.contactAvatarText}>
                          {contact.name?.charAt(0).toUpperCase() || 'U'}
                        </Text>
                      </View>
                    </View>
                    
                    {/* Contact Info */}
                    <View style={styles.contactInfo}>
                      <View style={styles.contactHeader}>
                        <Text style={styles.contactName} numberOfLines={1}>
                          {contact.name}
                        </Text>
                        {contact.isPrimary && (
                          <View style={styles.primaryBadge}>
                            <Icon name="star" size={12} color="#FFD700" />
                            <Text style={styles.primaryText}>Primary</Text>
          </View>
        )}
                      </View>
                      
                      <View style={styles.contactSubtitle}>
                        <Text style={styles.contactLastMessage} numberOfLines={1}>
                          {contact.relationship.charAt(0).toUpperCase() + contact.relationship.slice(1)} • {emergencyContactService.formatPhoneNumber(contact.phoneNumber)}
          </Text>
                      </View>
                    </View>
                    </TouchableOpacity>
                );
              })
              ) : (
                <View style={styles.emptyState}>
                  <Icon name="account-search" size={48} color={Colors.textLight} />
                  <Text style={styles.emptyStateTitle}>No emergency contacts</Text>
                  <Text style={styles.emptyStateMessage}>
                    Add your first emergency contact to get started
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyStateButton}
                    onPress={() => setShowAddModal(true)}
                  >
                    <Icon name="plus" size={20} color="#FFFFFF" />
                    <Text style={styles.emptyStateButtonText}>Add Contact</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
      </SlideView>

      {/* Modals */}
      {renderAddModal()}
      
      {showContactSelection && (
        <ContactSelectionScreen
          // @ts-ignore - Type mismatch due to re-exports, but functionally compatible
          onContactSelected={handleContactSelected as any}
          onBack={() => setShowContactSelection(false)}
          mode="single"
        />
      )}


      {showCreateGroup && (
        <CreateGroupModal
          visible={showCreateGroup}
          onClose={() => setShowCreateGroup(false)}
          onSuccess={() => {
            setShowCreateGroup(false);
            loadGroups();
          }}
          setSuccessModal={setSuccessModal}
          shareJoinCode={shareGroupCode}
          showToast={showToast}
        />
      )}

      {showJoinGroup && (
        <JoinGroupModal
          visible={showJoinGroup}
          onClose={() => setShowJoinGroup(false)}
          onSuccess={() => {
            setShowJoinGroup(false);
            loadGroups();
          }}
          showToast={showToast}
        />
      )}


      {/* Toast Notification */}
      {toast.visible && (
        <View style={[styles.toast, toast.type === 'success' ? styles.toastSuccess : styles.toastError]}>
          <Icon 
            name={toast.type === 'success' ? 'check-circle' : 'alert-circle'} 
            size={24} 
            color="#FFFFFF" 
          />
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}

      {/* Beautiful Success Modal */}
      {successModal.visible && (
        <Modal visible={successModal.visible} transparent animationType="fade">
          <View style={styles.successModalOverlay}>
            <View style={styles.successModalContent}>
              <View style={styles.successModalIcon}>
                <Icon name="check-circle" size={64} color="#10B981" />
              </View>
              <Text style={styles.successModalTitle}>{successModal.title}</Text>
              <Text style={styles.successModalMessage}>{successModal.message}</Text>
              
              {successModal.joinCode && (
                <View style={styles.joinCodeContainer}>
                  <Text style={styles.joinCodeLabel}>Join Code:</Text>
                  <View style={styles.joinCodeBox}>
                    <Text style={styles.joinCodeText}>{successModal.joinCode}</Text>
                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={() => {
                        Clipboard.setString(successModal.joinCode || '');
                        showToast('Code copied to clipboard!', 'success');
                      }}
                    >
                      <Icon name="content-copy" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <View style={styles.successModalButtons}>
                {successModal.joinCode && (
                  <TouchableOpacity
                    style={styles.successModalButtonSecondary}
                    onPress={() => {
                      if (successModal.joinCode) {
                        shareGroupCode(successModal.joinCode, successModal.groupName || '');
                      }
                    }}
                  >
                    <Icon name="share-variant" size={20} color={Colors.primary} />
                    <Text style={styles.successModalButtonTextSecondary}>Share Code</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.successModalButtonPrimary}
                  onPress={() => {
                    setSuccessModal({ visible: false, title: '', message: '' });
                    loadGroups();
                  }}
                >
                  <Text style={styles.successModalButtonTextPrimary}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.secondary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    flex: 1,
    maxWidth: 200,
  },
  headerSearchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: Colors.text,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 20,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textLight,
  },
  activeTabText: {
    color: Colors.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    marginVertical: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: Colors.text,
  },
  slideViewContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  emergencyListContainer: {
    backgroundColor: Colors.background,
  },
  contactListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  contactAvatarContainer: {
    marginRight: 12,
  },
  contactAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  contactInfo: {
    flex: 1,
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    flex: 1,
  },
  contactTime: {
    fontSize: 12,
    color: Colors.textLight,
    fontWeight: '400',
  },
  contactSubtitle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactLastMessage: {
    fontSize: 14,
    color: Colors.textLight,
    flex: 1,
    fontWeight: '400',
  },
  groupListContainer: {
    backgroundColor: Colors.background,
  },
  groupListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  groupAvatarContainer: {
    marginRight: 12,
  },
  groupAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  groupInfo: {
    flex: 1,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    flex: 1,
  },
  groupTime: {
    fontSize: 12,
    color: Colors.textLight,
    fontWeight: '400',
  },
  groupSubtitle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  groupLastMessage: {
    fontSize: 14,
    color: Colors.textLight,
    flex: 1,
    fontWeight: '400',
  },
  unreadBadge: {
    backgroundColor: '#10B981',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  chatListContainer: {
    backgroundColor: '#FFFFFF',
  },
  infoCard: {
    backgroundColor: Colors.primaryLight + '10',
    padding: 20,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 30,
    borderRadius: 15,
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  infoDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 15,
  },
  contactCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  primaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700' + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  primaryText: {
    fontSize: 10,
    color: '#FFD700',
    fontWeight: '600',
    marginLeft: 2,
  },
  contactPhone: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  contactEmail: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 2,
  },
  contactRelationship: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  contactActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 5,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.textLight,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 15,
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 10,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  helpSection: {
    flexDirection: 'row',
    backgroundColor: Colors.info + '10',
    padding: 15,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 15,
  },
  helpText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 12,
    lineHeight: 20,
  },
  // New Modal Styles
  createGroupModalContent: {
    backgroundColor: '#FFFFFF',
    flex: 1,
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  createGroupModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  createGroupModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  createGroupModalNext: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
  createGroupForm: {
    padding: 20,
  },
  formSection: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  groupNameInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  groupNameInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#000000',
  },
  groupImageUpload: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  uploadText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  participantsScroll: {
    marginTop: 8,
  },
  participantItem: {
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  participantAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  participantName: {
    fontSize: 12,
    color: '#000000',
    marginTop: 4,
    textAlign: 'center',
  },
  removeParticipant: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantModalContent: {
    backgroundColor: '#FFFFFF',
    flex: 1,
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  participantModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  participantModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  participantModalNext: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
  participantSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    marginHorizontal: 20,
    marginVertical: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  participantSearchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#000000',
  },
  selectedParticipantsScroll: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  selectedParticipantItem: {
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  selectedParticipantAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedParticipantAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  selectedParticipantName: {
    fontSize: 12,
    color: '#000000',
    marginTop: 4,
    textAlign: 'center',
  },
  removeSelectedParticipant: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addParticipantsSection: {
    flex: 1,
    paddingHorizontal: 20,
  },
  addParticipantsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 15,
  },
  participantsList: {
    flex: 1,
  },
  participantListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  participantListItemAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  participantListItemAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  participantListItemName: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
  },
  participantCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 10,
  },
  modalOptionText: {
    flex: 1,
    marginLeft: 15,
  },
  modalOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  modalOptionSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  modalCancelButton: {
    backgroundColor: Colors.secondary,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  groupModalContent: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  groupModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  groupModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  groupModalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
    marginTop: 12,
  },
  groupModalInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  groupModalTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  groupModalHint: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 5,
    fontStyle: 'italic',
  },
  groupModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  groupModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  groupModalButtonPrimary: {
    backgroundColor: Colors.primary,
  },
  groupModalButtonSecondary: {
    backgroundColor: Colors.secondary,
  },
  groupModalButtonTextPrimary: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  groupModalButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  toast: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  toastSuccess: {
    backgroundColor: '#10B981',
  },
  toastError: {
    backgroundColor: '#EF4444',
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 15,
  },
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successModalContent: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 20,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  successModalIcon: {
    marginBottom: 16,
  },
  successModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  successModalMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  joinCodeContainer: {
    width: '100%',
    marginBottom: 24,
  },
  joinCodeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  joinCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  joinCodeText: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  copyButton: {
    backgroundColor: Colors.primary,
    padding: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  successModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  successModalButtonPrimary: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  successModalButtonSecondary: {
    flex: 1,
    backgroundColor: Colors.secondary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  successModalButtonTextPrimary: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  successModalButtonTextSecondary: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  // Chat Screen Styles
  chatContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.secondary,
    backgroundColor: Colors.background,
  },
  backButton: {
    marginRight: 15,
  },
  chatHeaderInfo: {
    flex: 1,
  },
  chatGroupName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  chatGroupMembers: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  chatHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatActionButton: {
    padding: 8,
    marginLeft: 10,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#F0F0F0',
  },
  messagesContent: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 4,
    alignItems: 'flex-end',
  },
  ownMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  messageAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  messageBubble: {
    maxWidth: '70%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  ownMessageBubble: {
    backgroundColor: '#10B981', // Green for own messages
  },
  otherMessageBubble: {
    backgroundColor: '#E5E7EB', // Grey for other messages
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: Colors.text,
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
  },
  ownMessageTime: {
    color: '#FFFFFF',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: Colors.textSecondary,
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.secondary,
  },
  messageInputButton: {
    padding: 8,
    marginRight: 8,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.text,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginLeft: 8,
  },
  sendButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GroupsScreen;