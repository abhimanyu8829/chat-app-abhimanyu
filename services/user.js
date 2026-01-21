// ===============================
// USER SERVICE
// ===============================

import {
  db,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp
} from '../config/firebase.js';

export const UserService = {
  async createUserProfile(uid, email, userData = {}) {
    try {
      const userDocRef = doc(db, 'users', uid);

      const profileData = {
        uid,
        email,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        displayName: userData.displayName || email.split('@')[0],
        phone: userData.phone || '',
        bio: userData.bio || '',
        profilePicture: userData.profilePicture || userData.avatar || null,
        role: 'user',
        status: 'active',
        emailVerified: false,
        metadata: {
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          loginCount: 1,
          accountCreatedAt: Timestamp.now()
        },
        preferences: {
          language: 'en',
          timezone: 'UTC',
          theme: 'light',
          notificationsEnabled: true,
          emailNotifications: true
        },
        privacy: {
          profilePublic: false,
          showEmail: false,
          showLastSeen: false
        }
      };

      await setDoc(userDocRef, profileData);
      console.log('User profile created', { uid });
      return profileData;
    } catch (error) {
      console.error('Failed to create user profile', { error: error.message, uid });
      throw error;
    }
  },

  async getUserProfile(uid) {
    try {
      const userDocRef = doc(db, 'users', uid);
      const userSnapshot = await getDoc(userDocRef);

      if (!userSnapshot.exists()) {
        return null;
      }

      return userSnapshot.data();
    } catch (error) {
      console.error('Failed to get user profile', { error: error.message, uid });
      throw error;
    }
  },

  async updateUserProfile(uid, updates) {
    try {
      const userDocRef = doc(db, 'users', uid);

      const updateData = {
        ...updates,
        'metadata.updatedAt': serverTimestamp()
      };

      await updateDoc(userDocRef, updateData);
      console.log('User profile updated', { uid });
      return updateData;
    } catch (error) {
      console.error('Failed to update user profile', { error: error.message, uid });
      throw error;
    }
  },

  async updateLastLogin(uid) {
    try {
      const userDocRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) return;

      const currentData = userDoc.data();
      const loginCount = (currentData.metadata?.loginCount || 0) + 1;

      await updateDoc(userDocRef, {
        'metadata.lastLogin': serverTimestamp(),
        'metadata.loginCount': loginCount
      });

      console.log('Last login updated', { uid, loginCount });
    } catch (error) {
      console.error('Failed to update last login', { error: error.message, uid });
    }
  },

  async deleteUserAccount(uid) {
    try {
      const userDocRef = doc(db, 'users', uid);
      await deleteDoc(userDocRef);
      console.log('User account deleted', { uid });
    } catch (error) {
      console.error('Failed to delete user account', { error: error.message, uid });
      throw error;
    }
  },

  async getUserActivity(uid, limitCount = 10) {
    try {
      const activitiesRef = collection(db, 'users', uid, 'activity');
      const q = query(activitiesRef, orderBy('timestamp', 'desc'), limit(limitCount));
      const snapshot = await getDocs(q);

      const activities = [];
      snapshot.forEach(doc => {
        activities.push(doc.data());
      });

      return activities;
    } catch (error) {
      console.error('Failed to get user activity', { error: error.message, uid });
      return [];
    }
  },

  async logUserActivity(uid, activityType, details = {}) {
    try {
      const activityRef = collection(db, 'users', uid, 'activity');
      await setDoc(doc(activityRef), {
        type: activityType,
        timestamp: serverTimestamp(),
        userAgent: navigator.userAgent,
        details
      });

      console.log('Activity logged', { uid, activityType });
    } catch (error) {
      console.error('Failed to log activity', { error: error.message, uid });
    }
  },

  async getActivityLog(uid, limitCount = 10) {
    try {
      const activityRef = collection(db, 'users', uid, 'activity');
      const q = query(activityRef, orderBy('timestamp', 'desc'), limit(limitCount));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Failed to fetch activity log', error);
      return [];
    }
  },

  // Profile Picture Management
  async uploadProfilePicture(uid, file) {
    try {
      if (!file) throw new Error('No file provided');
      if (!file.type.startsWith('image/')) throw new Error('File must be an image');
      if (file.size > 800 * 1024) throw new Error('Image must be less than 800KB for Firestore storage');

      const reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.onload = async (e) => {
          try {
            const base64 = e.target.result;
            await this.updateUserProfile(uid, {
              profilePicture: base64,
              'metadata.profilePictureUpdatedAt': serverTimestamp()
            });
            console.log('Profile picture uploaded', { uid });
            resolve(base64);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
    } catch (error) {
      console.error('Failed to upload profile picture', { error: error.message, uid });
      throw error;
    }
  },

  async removeProfilePicture(uid) {
    try {
      await this.updateUserProfile(uid, {
        profilePicture: null,
        'metadata.profilePictureUpdatedAt': serverTimestamp()
      });
      console.log('Profile picture removed', { uid });
    } catch (error) {
      console.error('Failed to remove profile picture', { error: error.message, uid });
      throw error;
    }
  },

  async getProfilePictureURL(uid) {
    try {
      const userProfile = await this.getUserProfile(uid);
      return userProfile?.profilePicture || null;
    } catch (error) {
      console.error('Failed to get profile picture URL', { error: error.message, uid });
      return null;
    }
  }
};
