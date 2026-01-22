// ===============================
// CHAT SERVICE
// ===============================
import {
  db,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  serverTimestamp,
  addDoc,
  onSnapshot,
  Timestamp
} from '../config/firebase.js';

export const ChatService = {
  // Get list of all users except current user
  async getAllUsers(currentUserId) {
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);

      const users = [];
      snapshot.forEach(doc => {
        if (doc.id !== currentUserId) {
          users.push({
            uid: doc.id,
            ...doc.data()
          });
        }
      });

      return users.sort((a, b) => a.displayName.localeCompare(b.displayName));
    } catch (error) {
      console.error('Failed to get users', error);
      return [];
    }
  },

  // Listen to real-time users
  onUsersChange(currentUserId, callback) {
    try {
      const usersRef = collection(db, 'users');
      return onSnapshot(usersRef, (snapshot) => {
        const users = [];
        snapshot.forEach(docSnap => {
          if (docSnap.id !== currentUserId) {
            users.push({
              uid: docSnap.id,
              ...docSnap.data()
            });
          }
        });
        const sortedUsers = users.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
        callback(sortedUsers);
      });
    } catch (error) {
      console.error('Failed to listen to users', error);
      return null;
    }
  },

  // Generate chat room ID (alphabetically sorted UIDs)
  generateChatRoomId(uid1, uid2) {
    return [uid1, uid2].sort().join('_');
  },

  // Send a message
  async sendMessage(senderId, recipientId, messageData) {
    try {
      const message = messageData.text || '';
      const chatRoomId = this.generateChatRoomId(senderId, recipientId);
      const messagesRef = collection(db, 'chats', chatRoomId, 'messages');

      await addDoc(messagesRef, {
        senderId,
        recipientId,
        message,
        attachment: messageData.attachment || null,
        timestamp: serverTimestamp(),
        read: false
      });

      console.log('Message document created in Firestore for room:', chatRoomId);

      // Update chat room metadata for sorting and unread counts
      const chatRoomRef = doc(db, 'chats', chatRoomId);
      const chatRoomSnap = await getDoc(chatRoomRef);

      // Use a friendly placeholder for the sidebar list if only an attachment was sent
      const lastMessageText = messageData.lastMessageDisplay || message || (messageData.attachment ? '[Attachment]' : 'New message');

      const metadata = {
        lastMessage: lastMessageText,
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: senderId,
        participants: [senderId, recipientId]
      };

      // Increment unread count for the recipient
      metadata[`unreadCount_${recipientId}`] = (chatRoomSnap.exists() ? (chatRoomSnap.data()[`unreadCount_${recipientId}`] || 0) : 0) + 1;

      if (chatRoomSnap.exists()) {
        await updateDoc(chatRoomRef, metadata);
      } else {
        metadata.createdAt = serverTimestamp();
        await setDoc(chatRoomRef, metadata);
      }

      console.log('Chat room metadata synchronized successfully.');
    } catch (error) {
      console.error('Failed to send message', error);
      throw error;
    }
  },

  // Get messages for a chat room - OPTIMIZED for speed
  async getMessages(senderId, recipientId, limitCount = 50) {
    try {
      const chatRoomId = this.generateChatRoomId(senderId, recipientId);
      const messagesRef = collection(db, 'chats', chatRoomId, 'messages');
      const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(limitCount));

      const snapshot = await getDocs(q);
      const messages = [];

      snapshot.forEach(doc => {
        messages.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return messages;
    } catch (error) {
      console.error('Failed to get messages', error);
      return [];
    }
  },

  // Listen to real-time messages - OPTIMIZED
  onMessagesChange(senderId, recipientId, callback) {
    try {
      const chatRoomId = this.generateChatRoomId(senderId, recipientId);
      const messagesRef = collection(db, 'chats', chatRoomId, 'messages');
      const q = query(messagesRef, orderBy('timestamp', 'asc'));

      return onSnapshot(q, (snapshot) => {
        const messages = [];
        snapshot.forEach(doc => {
          messages.push({
            id: doc.id,
            ...doc.data()
          });
        });
        callback(messages);
      }, (error) => {
        console.error('Listener error:', error);
      });
    } catch (error) {
      console.error('Failed to listen to messages', error);
      return null;
    }
  },

  // Mark messages as read and reset unread count
  async markMessagesAsRead(senderId, recipientId, currentUserId) {
    try {
      const chatRoomId = this.generateChatRoomId(senderId, recipientId);

      // 1. Reset unread count in chat room doc
      const chatRoomRef = doc(db, 'chats', chatRoomId);
      const updateData = {};
      updateData[`unreadCount_${currentUserId}`] = 0;
      await updateDoc(chatRoomRef, updateData).catch(e => console.warn('Chat room update failed', e));

      // 2. Mark individual messages as read
      const messagesRef = collection(db, 'chats', chatRoomId, 'messages');
      const q = query(messagesRef, where('recipientId', '==', currentUserId), where('read', '==', false));

      const snapshot = await getDocs(q);
      snapshot.forEach(async (docSnap) => {
        await updateDoc(doc(db, 'chats', chatRoomId, 'messages', docSnap.id), {
          read: true
        });
      });
    } catch (error) {
      console.error('Failed to mark messages as read', error);
    }
  },

  // Listen for chat rooms the user is part of
  onChatRoomsChange(currentUserId, callback) {
    try {
      const q = query(collection(db, 'chats'), where('participants', 'array-contains', currentUserId));
      return onSnapshot(q, (snapshot) => {
        const rooms = {};
        snapshot.forEach(doc => {
          rooms[doc.id] = { id: doc.id, ...doc.data() };
        });
        callback(rooms);
      });
    } catch (e) {
      console.error('Failed to listen to chat rooms', e);
      return null;
    }
  },

  // Set typing status
  async setTypingStatus(senderId, recipientId, isTyping) {
    try {
      const chatRoomId = this.generateChatRoomId(senderId, recipientId);
      const typingRef = doc(db, 'chats', chatRoomId, 'typing', senderId);
      await setDoc(typingRef, {
        isTyping,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Failed to set typing status', error);
    }
  },

  // Listen for typing status
  onTypingStatusChange(senderId, recipientId, recipientUserId, callback) {
    try {
      const chatRoomId = this.generateChatRoomId(senderId, recipientId);
      const typingRef = doc(db, 'chats', chatRoomId, 'typing', recipientUserId);
      return onSnapshot(typingRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const timestamp = data.timestamp?.toDate?.() || new Date(data.timestamp);
          const now = new Date();
          // Only trigger if status is recent (within 10 seconds)
          if (data.isTyping && (now - timestamp) < 10000) {
            callback(true);
          } else {
            callback(false);
          }
        } else {
          callback(false);
        }
      });
    } catch (error) {
      console.error('Failed to listen for typing status', error);
      return null;
    }
  }
};
