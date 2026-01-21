// ===============================
// MAIN APPLICATION ENTRY POINT
// ===============================

import { AppState } from './services/app-state.js';
import { UserService } from './services/user.js';
import { AuthService } from './services/auth.js';
import { UIHelper } from './services/ui.js';
import { Validators } from './services/validators.js';
import { ChatService } from './services/chat.js';
import { auth, onAuthStateChanged, updateProfile } from './config/firebase.js';

// Make services globally available for HTML onclick handlers
window.AppState = AppState;
window.UserService = UserService;
window.AuthService = AuthService;
window.UIHelper = UIHelper;
window.Validators = Validators;
window.ChatService = ChatService;

// Apply theme immediately from localStorage
const savedTheme = localStorage.getItem('theme') || 'auto';
UIHelper.applyTheme(savedTheme);

// ===============================
// PROFILE MANAGEMENT
// ===============================
window.updateUserProfile = async () => {
  try {
    if (!AppState.currentUser) return;

    const firstName = document.getElementById('profileFirstName')?.value.trim() || '';
    const lastName = document.getElementById('profileLastName')?.value.trim() || '';
    const phone = document.getElementById('profilePhone')?.value.trim() || '';
    const bio = document.getElementById('profileBio')?.value.trim() || '';

    if (!Validators.validateName(firstName, 'profileFirstName')) return;
    if (lastName && !Validators.validateName(lastName, 'profileLastName')) return;

    // Quick validation for phone - more loose
    if (phone && phone.length < 5) {
      UIHelper.showAlert('Please enter a valid phone number', 'error');
      return;
    }

    AppState.setLoading(true);

    const displayName = `${firstName} ${lastName}`.trim() || firstName;

    await updateProfile(auth.currentUser, { displayName });

    await UserService.updateUserProfile(AppState.currentUser.uid, {
      firstName,
      lastName,
      displayName,
      phone,
      bio
    });

    await UserService.logUserActivity(AppState.currentUser.uid, 'profile_updated', {
      fields: ['firstName', 'lastName', 'phone', 'bio']
    });

    const updatedUser = await UserService.getUserProfile(AppState.currentUser.uid);
    AppState.setUserProfile(updatedUser);
    await AppState.updateDashboard(updatedUser);

    UIHelper.showAlert('✓ Profile synchronized successfully', 'success');
  } catch (error) {
    console.error('Profile update error', error);
    UIHelper.showAlert('Failed to update profile', 'error');
  } finally {
    AppState.setLoading(false);
  }
};

// ===============================
// SETTINGS MANAGEMENT
// ===============================
window.updateSettings = async () => {
  try {
    if (!AppState.currentUser) return;

    const language = document.getElementById('settingLanguage')?.value || 'en';
    const timezone = document.getElementById('settingTimezone')?.value || 'UTC';
    const theme = document.getElementById('settingTheme')?.value || 'light';
    const notificationsEnabled = document.getElementById('settingNotifications')?.checked ?? true;
    const emailNotifications = document.getElementById('settingEmailNotifs')?.checked ?? true;

    AppState.setLoading(true);

    const preferences = {
      language,
      timezone,
      theme,
      notificationsEnabled,
      emailNotifications
    };

    await UserService.updateUserProfile(AppState.currentUser.uid, { preferences });

    UIHelper.applyTheme(theme);

    await UserService.logUserActivity(AppState.currentUser.uid, 'settings_updated', {
      updatedFields: Object.keys(preferences)
    });

    const updatedProfile = await UserService.getUserProfile(AppState.currentUser.uid);
    AppState.setUserProfile(updatedProfile);

    UIHelper.showAlert('✓ Configuration parameters applied', 'success');
  } catch (error) {
    console.error('Settings update error', error);
    UIHelper.showAlert('Failed to apply parameters', 'error');
  } finally {
    AppState.setLoading(false);
  }
};

// ===============================
// PRIVACY SETTINGS
// ===============================
window.updatePrivacy = async () => {
  try {
    if (!AppState.currentUser) return;

    const profilePublic = document.getElementById('privacyProfilePublic')?.checked || false;
    const showEmail = document.getElementById('privacyShowEmail')?.checked || false;
    const showLastSeen = document.getElementById('privacyShowLastSeen')?.checked || false;

    AppState.setLoading(true);

    const privacy = {
      profilePublic,
      showEmail,
      showLastSeen
    };

    await UserService.updateUserProfile(AppState.currentUser.uid, { privacy });

    await UserService.logUserActivity(AppState.currentUser.uid, 'privacy_updated', {
      updatedFields: Object.keys(privacy)
    });

    UIHelper.showAlert('✓ Privacy settings updated successfully!', 'success');
  } catch (error) {
    console.error('Privacy update error', error);
    UIHelper.showAlert('Failed to update privacy settings', 'error');
  } finally {
    AppState.setLoading(false);
  }
};

// ===============================
// LOAD PROFILE DATA
// ===============================
const loadProfileData = async () => {
  try {
    if (!AppState.currentUser) return;

    const profile = AppState.userProfile || (await UserService.getUserProfile(AppState.currentUser.uid));

    if (profile) {
      document.getElementById('profileFirstName').value = profile.firstName || '';
      document.getElementById('profileLastName').value = profile.lastName || '';
      document.getElementById('profilePhone').value = profile.phone || '';
      document.getElementById('profileBio').value = profile.bio || '';

      document.getElementById('previewName').textContent =
        `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Unidentified Node';
      document.getElementById('previewEmail').textContent = profile.email || '';

      // Load profile picture
      const profilePicturePreview = document.getElementById('profilePicturePreview');
      const removeBtn = document.getElementById('removeProfilePictureBtn');
      const avatarUrl = profile.profilePicture || 'https://www.w3schools.com/howto/img_avatar.png';

      if (profilePicturePreview) profilePicturePreview.src = avatarUrl;

      if (removeBtn) {
        if (profile.profilePicture) {
          removeBtn.classList.remove('hidden');
        } else {
          removeBtn.classList.add('hidden');
        }
      }
    }

    // Add file input event listener
    const fileInput = document.getElementById('profilePictureInput');
    if (fileInput && !fileInput.hasListener) {
      fileInput.addEventListener('change', window.handleProfilePictureChange);
      fileInput.hasListener = true;
    }
  } catch (error) {
    console.error('Failed to load profile data', error);
  }
};

// ===============================
// LOAD SETTINGS DATA
// ===============================
const loadSettingsData = async () => {
  try {
    if (!AppState.currentUser) return;

    const profile = AppState.userProfile || (await UserService.getUserProfile(AppState.currentUser.uid));

    if (profile && profile.preferences) {
      const prefs = profile.preferences;
      if (document.getElementById('settingLanguage')) document.getElementById('settingLanguage').value = prefs.language || 'en';
      if (document.getElementById('settingTimezone')) document.getElementById('settingTimezone').value = prefs.timezone || 'UTC';
      if (document.getElementById('settingTheme')) document.getElementById('settingTheme').value = prefs.theme || 'light';
      UIHelper.applyTheme(prefs.theme || 'light');

      const settingNotifs = document.getElementById('settingNotifications');
      const settingEmailNotifs = document.getElementById('settingEmailNotifs');
      if (settingNotifs) settingNotifs.checked = prefs.notificationsEnabled !== false;
      if (settingEmailNotifs) settingEmailNotifs.checked = prefs.emailNotifications !== false;
    }

    if (profile && profile.privacy) {
      const privacy = profile.privacy;
      document.getElementById('privacyProfilePublic').checked = privacy.profilePublic || false;
      document.getElementById('privacyShowEmail').checked = privacy.showEmail || false;
      document.getElementById('privacyShowLastSeen').checked = privacy.showLastSeen || false;
    }
  } catch (error) {
    console.error('Failed to load settings data', error);
  }
};

// ===============================
// SIDEBAR & NAVIGATION
// ===============================
window.toggleSidebar = () => {
  const sidebar = document.getElementById('sidebarContainer');
  sidebar?.classList.toggle('minimized');
};

window.toggleNotifications = () => {
  const dropdown = document.getElementById('notificationsDropdown');
  if (dropdown) {
    dropdown.classList.toggle('hidden');
    // Hide dot when opened
    if (!dropdown.classList.contains('hidden')) {
      document.getElementById('notifDot')?.classList.add('hidden');
    }
  }
};

window.handleGlobalSearch = (query) => {
  if (!query) return;
  const q = query.toLowerCase();

  if (q.includes('profile') || q.includes('identity') || q.includes('me')) {
    window.navigateTo('profile');
  } else if (q.includes('chat') || q.includes('message') || q.includes('channel')) {
    window.navigateTo('chat');
  } else if (q.includes('setting') || q.includes('preference') || q.includes('theme')) {
    window.navigateTo('settings');
  } else if (q.includes('dash') || q.includes('home')) {
    window.navigateTo('dashboard');
  } else {
    UIHelper.showAlert(`Search for "${query}" initiated. Accessing global logs...`, 'success');
  }
};

window.navigateTo = (page) => {
  document.getElementById('dashboardPage')?.classList.add('hidden');
  document.getElementById('profilePage')?.classList.add('hidden');
  document.getElementById('chatPage')?.classList.add('hidden');
  document.getElementById('settingsPage')?.classList.add('hidden');

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  const breadcrumb = document.getElementById('breadcrumbCurrent');

  if (page === 'dashboard') {
    document.getElementById('dashboardPage')?.classList.remove('hidden');
    document.querySelectorAll('.nav-btn')[0]?.classList.add('active');
    if (breadcrumb) breadcrumb.textContent = 'Dashboard';
  } else if (page === 'profile') {
    document.getElementById('profilePage')?.classList.remove('hidden');
    document.querySelectorAll('.nav-btn')[2]?.classList.add('active');
    if (breadcrumb) breadcrumb.textContent = 'Identity';
    loadProfileData();
  } else if (page === 'chat') {
    document.getElementById('chatPage')?.classList.remove('hidden');
    document.querySelectorAll('.nav-btn')[1]?.classList.add('active');
    if (breadcrumb) breadcrumb.textContent = 'Channels';
    window.loadUsers();
  } else if (page === 'settings') {
    document.getElementById('settingsPage')?.classList.remove('hidden');
    document.querySelectorAll('.nav-btn')[3]?.classList.add('active');
    if (breadcrumb) breadcrumb.textContent = 'Preferences';
    loadSettingsData();
  }

  console.log('Navigated to page', { page });
};

// ===============================
// TOGGLE SECTIONS
// ===============================
window.toggleSection = (section) => {
  const sections = ['signupSection', 'loginSection', 'resetSection'];

  sections.forEach(sec => {
    const el = document.getElementById(sec);
    if (el) {
      el.classList.add('hidden');
    }
  });

  const sectionEl = document.getElementById(section + 'Section');
  if (sectionEl) sectionEl.classList.remove('hidden');

  document.querySelectorAll('input').forEach(input => {
    input.value = '';
    input.classList.remove('error');
  });
  document.querySelectorAll('.error-message').forEach(err => {
    err.classList.remove('active');
  });
};

// ===============================
// AUTH HANDLERS
// ===============================
window.register = () => AuthService.register(
  document.getElementById('regEmail').value.trim(),
  document.getElementById('regPassword').value,
  document.getElementById('regConfirmPassword').value
);

window.login = () => AuthService.login(
  document.getElementById('loginEmail').value.trim(),
  document.getElementById('loginPassword').value
);

window.resetPassword = () => AuthService.resetPassword(
  document.getElementById('resetEmail').value.trim()
);

window.signInWithGoogle = () => AuthService.signInWithGoogle();

window.logout = () => AuthService.logout();

window.deleteAccount = () => AuthService.deleteAccount();

// ===============================
// CHAT FUNCTIONS
// ===============================
let currentChatUser = null;
let unsubscribeChat = null;
let unsubscribeUsers = null;
let usersCache = [];

window.loadUsers = () => {
  if (!AppState.currentUser) return;
  if (unsubscribeUsers) return;

  unsubscribeUsers = ChatService.onUsersChange(AppState.currentUser.uid, (users) => {
    usersCache = users;
    window.displayUsers(users);

    if (currentChatUser) {
      const updatedUser = users.find(u => u.uid === currentChatUser.uid);
      if (updatedUser) {
        window.updateChatHeader(updatedUser);
      }
    }
  });
};

window.displayUsers = (users) => {
  const usersList = document.getElementById('usersList');
  if (!usersList) return;

  usersList.innerHTML = users.map(user => `
    <div onclick="window.openChat('${user.uid}')" 
      class="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group">
      <div class="flex items-center gap-3">
        <div class="relative shrink-0">
          <img src="${user.profilePicture || 'https://www.w3schools.com/howto/img_avatar.png'}" 
               class="w-12 h-12 rounded-xl object-cover border-2 border-transparent group-hover:border-indigo-100 dark:group-hover:border-indigo-900 transition-all">
          <div class="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-dark-card rounded-full"></div>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex justify-between items-baseline mb-0.5">
            <p class="font-bold text-slate-900 dark:text-white truncate text-sm">${Validators.escapeHTML(user.displayName)}</p>
            <span class="text-[10px] text-slate-400 font-medium">Online</span>
          </div>
          <p class="text-xs text-slate-500 truncate font-medium">ID: ${Validators.escapeHTML(user.email.split('@')[0])}...</p>
        </div>
      </div>
    </div>
  `).join('');
};

window.openChat = async (userId) => {
  const user = usersCache.find(u => u.uid === userId);
  if (!user) {
    // Fallback if not in cache (e.g. initial load)
    const profile = await UserService.getUserProfile(userId);
    if (!profile) return;
    currentChatUser = profile;
  } else {
    currentChatUser = user;
  }

  // Show loading state
  const chatMessages = document.getElementById('chatMessages');
  if (chatMessages) {
    chatMessages.innerHTML = '<div class="p-4 text-center text-gray-400">Synchronizing connection...</div>';
  }

  // Update header immediately
  window.updateChatHeader(currentChatUser);

  // Unsubscribe from previous listener
  if (unsubscribeChat) unsubscribeChat();

  // Load messages in parallel 
  const messages = await ChatService.getMessages(AppState.currentUser.uid, userId, 50);
  window.displayMessages(messages);

  ChatService.markMessagesAsRead(AppState.currentUser.uid, userId, AppState.currentUser.uid);

  unsubscribeChat = ChatService.onMessagesChange(AppState.currentUser.uid, userId, (updatedMessages) => {
    if (updatedMessages.length !== messages.length) {
      window.displayMessages(updatedMessages);
    }
  });
};

window.updateChatHeader = (user) => {
  const chatHeader = document.getElementById('chatHeader');
  if (chatHeader) {
    chatHeader.innerHTML = `
      <div class="flex items-center gap-3 animate-fade-in">
        <div class="relative">
          <img src="${user.profilePicture || 'https://www.w3schools.com/howto/img_avatar.png'}" 
               class="w-10 h-10 rounded-xl object-cover border-2 border-indigo-100 dark:border-indigo-900 transition-all duration-500">
          <div class="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-dark-card rounded-full"></div>
        </div>
        <div>
          <h3 class="font-bold text-slate-900 dark:text-white text-sm">${Validators.escapeHTML(user.displayName)}</h3>
          <div class="flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            <p class="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Active Connection</p>
          </div>
        </div>
      </div>
    `;
  }
};

window.displayMessages = (messages) => {
  const chatMessages = document.getElementById('chatMessages');
  if (!chatMessages) return;

  if (messages.length === 0) {
    chatMessages.innerHTML = '<div class="p-4 text-center text-gray-400">No messages yet. Start a conversation!</div>';
    return;
  }

  chatMessages.innerHTML = messages.map(msg => {
    const timestamp = msg.timestamp?.toDate?.() || new Date(msg.timestamp);
    const timeString = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isOwn = msg.senderId === AppState.currentUser.uid;

    return `
    <div class="flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fade-in group">
      <div class="flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[80%]">
        <div class="${isOwn ? 'bg-indigo-600 text-white shadow-indigo-200 shadow-md rounded-2xl rounded-tr-none' : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700 rounded-2xl rounded-tl-none shadow-sm'} px-4 py-2.5">
          <p class="text-sm leading-relaxed">${Validators.escapeHTML(msg.message)}</p>
        </div>
        <div class="flex items-center gap-2 mt-1.5 px-1">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">${timeString}</p>
          ${isOwn ? '<i class="fas fa-check-double text-[10px] text-indigo-400"></i>' : ''}
        </div>
      </div>
    </div>
  `}).join('');

  // Auto scroll to bottom
  setTimeout(() => {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }, 0);
};

window.sendMessage = async () => {
  try {
    if (!currentChatUser || !AppState.currentUser) return;

    const input = document.getElementById('messageInput');
    const message = input.value.trim();

    if (!message) return;

    await ChatService.sendMessage(AppState.currentUser.uid, currentChatUser.uid, message);
    input.value = '';
  } catch (error) {
    console.error('Failed to send message', error);
    UIHelper.showAlert('Failed to send message', 'error');
  }
};

// ===============================
// PROFILE PICTURE MANAGEMENT
// ===============================
window.handleProfilePictureChange = async (event) => {
  try {
    const file = event.target.files?.[0];
    if (!file) return;

    AppState.setLoading(true);
    const uploadProgress = document.getElementById('uploadProgressProfile');
    uploadProgress?.classList.remove('hidden');

    const pictureURL = await UserService.uploadProfilePicture(AppState.currentUser.uid, file);

    await UserService.logUserActivity(AppState.currentUser.uid, 'profile_picture_uploaded', {
      fileName: file.name,
      fileSize: file.size
    });

    const profilePicturePreview = document.getElementById('profilePicturePreview');
    if (profilePicturePreview) {
      profilePicturePreview.src = pictureURL;
    }

    const removeBtn = document.getElementById('removeProfilePictureBtn');
    if (removeBtn) {
      removeBtn.classList.remove('hidden');
    }

    UIHelper.showAlert('✓ Profile picture updated successfully!', 'success');

    // Update global state and UI
    const updatedProfile = await UserService.getUserProfile(AppState.currentUser.uid);
    AppState.setUserProfile(updatedProfile);
    AppState.updateDashboard(updatedProfile);

    event.target.value = ''; // Reset file input
  } catch (error) {
    console.error('Profile picture upload error', error);
    UIHelper.showAlert(error.message || 'Failed to upload profile picture', 'error');
  } finally {
    AppState.setLoading(false);
    const uploadProgress = document.getElementById('uploadProgressProfile');
    uploadProgress?.classList.add('hidden');
  }
};

window.removeProfilePicture = async () => {
  try {
    const confirmed = confirm('Are you sure you want to remove your profile picture?');
    if (!confirmed) return;

    AppState.setLoading(true);

    await UserService.removeProfilePicture(AppState.currentUser.uid);

    await UserService.logUserActivity(AppState.currentUser.uid, 'profile_picture_removed', {});

    const profilePicturePreview = document.getElementById('profilePicturePreview');
    if (profilePicturePreview) {
      profilePicturePreview.src = 'https://www.w3schools.com/howto/img_avatar.png';
    }

    const removeBtn = document.getElementById('removeProfilePictureBtn');
    if (removeBtn) {
      removeBtn.classList.add('hidden');
    }

    UIHelper.showAlert('✓ Profile picture removed successfully!', 'success');

    // Update global state and UI
    const updatedProfile = await UserService.getUserProfile(AppState.currentUser.uid);
    AppState.setUserProfile(updatedProfile);
    AppState.updateDashboard(updatedProfile);
  } catch (error) {
    console.error('Profile picture removal error', error);
    UIHelper.showAlert('Failed to remove profile picture', 'error');
  } finally {
    AppState.setLoading(false);
  }
};

// ===============================
// AUTH STATE LISTENER
// ===============================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    AppState.setCurrentUser(user);
    await AppState.updateUI();
    const profile = AppState.userProfile;
    if (profile && profile.preferences && profile.preferences.theme) {
      UIHelper.applyTheme(profile.preferences.theme);
    }
    loadProfileData();
    loadSettingsData();
  } else {
    AppState.setCurrentUser(null);
    AppState.setUserProfile(null);
    AppState.showPage('authContainer');
  }

  // Hide loading screen after auth state is determined
  setTimeout(() => {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
      loadingScreen.classList.add('hide-loading');
    }
  }, 300);
});

console.log('Application initialized successfully!');
