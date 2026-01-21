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
  async sendMessage(senderId, recipientId, message) {
    try {
      const chatRoomId = this.generateChatRoomId(senderId, recipientId);
      const messagesRef = collection(db, 'chats', chatRoomId, 'messages');

      await addDoc(messagesRef, {
        senderId,
        recipientId,
        message,
        timestamp: serverTimestamp(),
        read: false
      });

      // Update chat room last message
      const chatRoomRef = doc(db, 'chats', chatRoomId);
      await updateDoc(chatRoomRef, {
        lastMessage: message,
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: senderId
      }).catch(() => {
        // If doc doesn't exist, create it
        return setDoc(chatRoomRef, {
          participants: [senderId, recipientId],
          lastMessage: message,
          lastMessageTime: serverTimestamp(),
          lastMessageSenderId: senderId,
          createdAt: serverTimestamp()
        });
      });

      console.log('Message sent successfully');
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

  // Mark messages as read - ASYNC operation
  async markMessagesAsRead(senderId, recipientId, recipientUserId) {
    try {
      const chatRoomId = this.generateChatRoomId(senderId, recipientId);
      const messagesRef = collection(db, 'chats', chatRoomId, 'messages');
      const q = query(messagesRef, where('recipientId', '==', recipientUserId), where('read', '==', false));

      const snapshot = await getDocs(q);

      snapshot.forEach(async (docSnap) => {
        await updateDoc(doc(db, 'chats', chatRoomId, 'messages', docSnap.id), {
          read: true
        });
      });
    } catch (error) {
      console.error('Failed to mark messages as read', error);
    }
  }
};
