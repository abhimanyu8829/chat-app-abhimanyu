// ===============================
// AUTHENTICATION SERVICE
// ===============================

import { AppState } from './app-state.js';
import { UserService } from './user.js';
import { Validators } from './validators.js';
import { UIHelper } from './ui.js';
import {
  auth,
  googleProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  deleteUser,
  signInWithPopup
} from '../config/firebase.js';

export const AuthService = {
  async register(email, password, confirmPassword) {
    try {
      if (!Validators.validateEmail(email, 'regEmail')) return;
      if (!Validators.validatePassword(password, 'regPassword')) return;
      if (!Validators.validatePasswordMatch(password, confirmPassword, 'regConfirmPassword')) return;

      AppState.setLoading(true);

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await UserService.createUserProfile(userCredential.user.uid, email);
      await UserService.logUserActivity(userCredential.user.uid, 'account_created', {
        method: 'email_password'
      });

      document.getElementById('regEmail').value = '';
      document.getElementById('regPassword').value = '';
      document.getElementById('regConfirmPassword').value = '';

      UIHelper.showAlert('✓ Account created successfully! Welcome aboard!', 'success');
      AppState.setCurrentUser(userCredential.user);
    } catch (error) {
      console.error('Registration error', error);
      let message = 'An error occurred during registration';

      if (error.code === 'auth/email-already-in-use') {
        message = 'This email is already registered. Please login or use another email.';
      } else if (error.code === 'auth/weak-password') {
        message = 'Password is too weak. Please use a stronger password.';
      }

      UIHelper.showAlert(message, 'error');
    } finally {
      AppState.setLoading(false);
    }
  },

  async login(email, password) {
    try {
      if (!Validators.validateEmail(email, 'loginEmail')) return;
      if (!password.trim()) {
        Validators.showError(
          document.getElementById('loginPassword'),
          document.getElementById('loginPassword').nextElementSibling,
          'Password is required'
        );
        return;
      }

      AppState.setLoading(true);

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await UserService.updateLastLogin(userCredential.user.uid);
      await UserService.logUserActivity(userCredential.user.uid, 'user_login', {
        method: 'email_password'
      });

      document.getElementById('loginEmail').value = '';
      document.getElementById('loginPassword').value = '';

      UIHelper.showAlert('✓ Login successful! Welcome back!', 'success');

      const profile = await UserService.getUserProfile(userCredential.user.uid);
      AppState.setUserProfile(profile);
      AppState.setCurrentUser(userCredential.user);
      await AppState.updateUI();
    } catch (error) {
      console.error('Login error', error);
      let message = 'Login failed. Please try again.';

      if (error.code === 'auth/user-not-found') {
        message = 'No account found with this email.';
      } else if (error.code === 'auth/wrong-password') {
        message = 'Incorrect password. Please try again.';
      }

      UIHelper.showAlert(message, 'error');
    } finally {
      AppState.setLoading(false);
    }
  },

  async resetPassword(email) {
    try {
      if (!Validators.validateEmail(email, 'resetEmail')) return;

      AppState.setLoading(true);

      await sendPasswordResetEmail(auth, email);

      document.getElementById('resetEmail').value = '';
      UIHelper.showAlert('✓ Password reset link sent! Check your email.', 'success');

      const user = auth.currentUser;
      if (user) {
        await UserService.logUserActivity(user.uid, 'password_reset_requested', { email });
      }

      setTimeout(() => window.toggleSection('login'), 3000);
    } catch (error) {
      console.error('Password reset error', error);
      let message = 'Failed to send reset email. Please try again.';

      if (error.code === 'auth/user-not-found') {
        message = 'No account found with this email.';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Too many requests. Please try again later.';
      }

      UIHelper.showAlert(message, 'error');
    } finally {
      AppState.setLoading(false);
    }
  },

  async signInWithGoogle() {
    try {
      console.log('Starting Google Sign-In...');
      AppState.setLoading(true);

      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      console.log('Google user:', user);

      let profile = await UserService.getUserProfile(user.uid);

      if (!profile) {
        console.log('Creating new profile for Google user');
        const firstName = user.displayName?.split(' ')[0] || '';
        const lastName = user.displayName?.split(' ').slice(1).join(' ') || '';
        const displayName = user.displayName || user.email.split('@')[0];

        profile = await UserService.createUserProfile(user.uid, user.email, {
          firstName,
          lastName,
          displayName,
          profilePicture: user.photoURL || null
        });

        await UserService.logUserActivity(user.uid, 'account_created_google', {
          method: 'google_oauth'
        });
      } else {
        console.log('Updating login for existing Google user');
        await UserService.updateLastLogin(user.uid);
        await UserService.logUserActivity(user.uid, 'user_login_google', {
          method: 'google_oauth'
        });
        profile = await UserService.getUserProfile(user.uid);
      }

      console.log('Final profile:', profile);
      UIHelper.showAlert('✓ Google sign-in successful! Welcome!', 'success');

      AppState.setUserProfile(profile);
      AppState.setCurrentUser(user);
      await AppState.updateUI();
    } catch (error) {
      console.error('Full Google Sign-In Error:', error);

      let message = 'Google sign-in failed. Please try again.';
      if (error.code === 'auth/popup-closed-by-user') {
        message = 'Sign-in was cancelled.';
      } else if (error.code === 'auth/popup-blocked') {
        message = 'Sign-in popup was blocked. Please allow popups and try again.';
      } else if (error.code === 'auth/network-request-failed') {
        message = 'Network error. Please check your connection.';
      } else if (error.code === 'auth/unauthorized-domain') {
        message = 'This domain is not authorized. Check Firebase Console.';
      }

      UIHelper.showAlert(message, 'error');
    } finally {
      AppState.setLoading(false);
    }
  },

  async logout() {
    try {
      const uid = AppState.currentUser?.uid;

      if (uid) {
        await UserService.logUserActivity(uid, 'user_logout', {});
      }

      await signOut(auth);
      AppState.setCurrentUser(null);
      AppState.setUserProfile(null);
      UIHelper.showAlert('✓ Logged out successfully', 'success');
      window.toggleSection('signup');
    } catch (error) {
      console.error('Logout error', error);
      UIHelper.showAlert('Failed to logout', 'error');
    }
  },

  async deleteAccount() {
    try {
      if (!AppState.currentUser) return;

      const confirmed = confirm('⚠️ Are you sure? This will permanently delete your account and all data.');
      if (!confirmed) return;

      const doubleConfirm = confirm('This action cannot be undone. Type "I understand" to continue.');
      if (!doubleConfirm) return;

      AppState.setLoading(true);

      const uid = AppState.currentUser.uid;

      await UserService.logUserActivity(uid, 'account_deletion_initiated', {});
      await UserService.deleteUserAccount(uid);
      await deleteUser(AppState.currentUser);

      UIHelper.showAlert('✓ Account deleted successfully', 'success');

      setTimeout(() => {
        AppState.setCurrentUser(null);
        AppState.setUserProfile(null);
        window.toggleSection('signup');
      }, 2000);
    } catch (error) {
      console.error('Account deletion error', error);
      UIHelper.showAlert('Failed to delete account. You may need to log in again.', 'error');
    } finally {
      AppState.setLoading(false);
    }
  }
};
