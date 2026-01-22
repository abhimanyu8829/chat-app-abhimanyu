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
  const backdrop = document.getElementById('sidebarBackdrop');
  const isMobile = window.innerWidth < 1024;

  if (isMobile) {
    sidebar?.classList.toggle('mobile-open');
    backdrop?.classList.toggle('active');
    sidebar?.classList.remove('minimized');
  } else {
    sidebar?.classList.toggle('minimized');
    sidebar?.classList.remove('mobile-open');
    backdrop?.classList.remove('active');
  }
};

window.handleGlobalSearch = async (query) => {
  const resultsContainer = document.getElementById('globalSearchResults');
  if (!query || query.length < 2) {
    window.clearSearchResults();
    return;
  }

  const q = query.toLowerCase();
  const results = {
    navigation: [],
    users: [],
    logs: []
  };

  // 1. Search Navigation
  const navItems = [
    { name: 'Dashboard Insights', path: 'dashboard', keywords: ['dash', 'home', 'insight', 'stat'] },
    { name: 'Channels & Messages', path: 'chat', keywords: ['chat', 'message', 'channel', 'communication'] },
    { name: 'Identity & Profile', path: 'profile', keywords: ['profile', 'identity', 'me', 'account'] },
    { name: 'System Preferences', path: 'settings', keywords: ['setting', 'preference', 'theme', 'config'] },
    { name: 'Protocol Logs', path: 'logs', keywords: ['log', 'audit', 'protocol', 'history'] }
  ];

  results.navigation = navItems.filter(item =>
    item.name.toLowerCase().includes(q) || item.keywords.some(k => k.includes(q))
  );

  // 2. Search Users (from cache)
  if (typeof usersCache !== 'undefined') {
    results.users = usersCache.filter(user =>
      (user.displayName || '').toLowerCase().includes(q) ||
      (user.email || '').toLowerCase().includes(q)
    ).slice(0, 5);
  }

  // 3. Search Logs (fetch latest)
  try {
    const logs = await UserService.getActivityLog(AppState.currentUser.uid, 20);
    results.logs = logs.filter(log =>
      log.type.toLowerCase().includes(q) ||
      JSON.stringify(log.details).toLowerCase().includes(q)
    ).slice(0, 5);
  } catch (e) {
    console.warn('Search: Log retrieval failed', e);
  }

  window.renderSearchResults(results);
};

window.renderSearchResults = (results) => {
  const container = document.getElementById('globalSearchResults');
  if (!container) return;

  const hasResults = results.navigation.length > 0 || results.users.length > 0 || results.logs.length > 0;

  if (!hasResults) {
    container.innerHTML = '<div class="p-4 text-center text-slate-500 text-sm">No synchronized nodes found</div>';
    container.classList.remove('hidden');
    return;
  }

  let html = '';

  if (results.navigation.length > 0) {
    html += `<div class="p-2 border-b border-slate-100 dark:border-dark-border"><p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 px-2">Navigation</p>`;
    results.navigation.forEach(item => {
      html += `
        <div onclick="window.navigateTo('${item.path}')" class="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors group">
          <i class="fas fa-link text-slate-400 group-hover:text-indigo-500"></i>
          <span class="text-sm font-medium text-slate-700 dark:text-slate-300">${item.name}</span>
        </div>`;
    });
    html += `</div>`;
  }

  if (results.users.length > 0) {
    html += `<div class="p-2 border-b border-slate-100 dark:border-dark-border"><p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 px-2">Identities</p>`;
    results.users.forEach(user => {
      html += `
        <div onclick="window.openChat('${user.uid}')" class="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors group">
          <img src="${user.profilePicture || 'https://www.w3schools.com/howto/img_avatar.png'}" class="w-6 h-6 rounded-full object-cover">
          <span class="text-sm font-medium text-slate-700 dark:text-slate-300">${Validators.escapeHTML(user.displayName)}</span>
        </div>`;
    });
    html += `</div>`;
  }

  if (results.logs.length > 0) {
    html += `<div class="p-2"><p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 px-2">Audit Logs</p>`;
    results.logs.forEach(log => {
      html += `
        <div class="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-default transition-colors group">
          <i class="fas fa-history text-slate-400"></i>
          <span class="text-sm text-slate-500 dark:text-slate-400 truncate">${log.type.replace(/_/g, ' ')} node event</span>
        </div>`;
    });
    html += `</div>`;
  }

  container.innerHTML = html;
  container.classList.remove('hidden');
};

window.clearSearchResults = () => {
  const container = document.getElementById('globalSearchResults');
  if (container) {
    container.classList.add('hidden');
    container.innerHTML = '';
  }
};

window.navigateTo = (page) => {
  document.getElementById('dashboardPage')?.classList.add('hidden');
  document.getElementById('profilePage')?.classList.add('hidden');
  document.getElementById('chatPage')?.classList.add('hidden');
  document.getElementById('settingsPage')?.classList.add('hidden');
  document.getElementById('logsPage')?.classList.add('hidden');

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  const breadcrumb = document.getElementById('breadcrumbCurrent');

  // Save active page for persistence
  localStorage.setItem('activePage', page);

  // Close chat on mobile when navigating
  window.closeChat();

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
  } else if (page === 'logs') {
    document.getElementById('logsPage')?.classList.remove('hidden');
    if (breadcrumb) breadcrumb.textContent = 'Protocol Logs';
    window.loadAllLogs();
  }

  // Close sidebar on mobile after navigation
  if (window.innerWidth < 1024) {
    const sidebar = document.getElementById('sidebarContainer');
    const backdrop = document.getElementById('sidebarBackdrop');
    sidebar?.classList.remove('mobile-open');
    backdrop?.classList.remove('active');
  }

  console.log('Navigated to page', { page });
};

window.loadAllLogs = async () => {
  const table = document.getElementById('fullLogsTable');
  if (!table) return;

  try {
    const logs = await UserService.getActivityLog(AppState.currentUser.uid, 50);

    if (logs.length === 0) {
      table.innerHTML = '<tr><td colspan="3" class="px-6 py-8 text-center text-slate-400">No events found in synchronization timeline.</td></tr>';
      return;
    }

    table.innerHTML = logs.map(log => {
      const timestamp = log.timestamp?.toDate?.() || new Date(log.timestamp);
      const timeStr = timestamp.toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
      });

      return `
        <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
          <td class="px-6 py-4">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full ${this.getLogColor(log.type)}"></span>
              <span class="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">${log.type.replace(/_/g, ' ')}</span>
            </div>
          </td>
          <td class="px-6 py-4">
            <p class="text-sm text-slate-600 dark:text-slate-400 font-medium">${Validators.escapeHTML(this.formatLogDetails(log))}</p>
          </td>
          <td class="px-6 py-4">
            <span class="text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">${timeStr}</span>
          </td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error('Failed to load logs', error);
    table.innerHTML = '<tr><td colspan="3" class="px-6 py-8 text-center text-rose-500">Failed to synchronize protocol stream.</td></tr>';
  }
};

window.getLogColor = (type) => {
  if (type.includes('error') || type.includes('failure')) return 'bg-rose-500';
  if (type.includes('login') || type.includes('auth')) return 'bg-indigo-500';
  if (type.includes('profile') || type.includes('update')) return 'bg-emerald-500';
  return 'bg-slate-400';
};

window.formatLogDetails = (log) => {
  if (log.type === 'user_login') return 'Authenticated session initialized via security gateway.';
  if (log.type === 'profile_updated') return `Interface parameters synchronized: ${Object.keys(log.details || {}).join(', ')}`;
  if (log.type === 'profile_picture_uploaded') return 'Visual identity resource updated in cloud storage.';
  return 'System event recorded in node history.';
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
let unsubscribeChat = null;
let unsubscribeUsers = null;
let unsubscribeTyping = null;
let usersCache = [];
let typingTimeout = null;

let unsubscribeRooms = null;
let roomsCache = {};

window.loadUsers = () => {
  if (!AppState.currentUser) return;
  if (unsubscribeUsers) return;

  // Listen to chat rooms for metadata
  unsubscribeRooms = ChatService.onChatRoomsChange(AppState.currentUser.uid, (rooms) => {
    roomsCache = rooms;
    if (usersCache.length > 0) {
      window.displayUsers(usersCache);
    }
  });

  // Listen to users
  unsubscribeUsers = ChatService.onUsersChange(AppState.currentUser.uid, (users) => {
    usersCache = users;
    window.displayUsers(users);

    if (AppState.currentChatUser) {
      const updatedUser = users.find(u => u.uid === AppState.currentChatUser.uid);
      if (updatedUser) {
        window.updateChatHeader(updatedUser);
      }
    }
  });
};

window.displayUsers = (users) => {
  const usersList = document.getElementById('usersList');
  if (!usersList) return;

  // Map users with room metadata
  const usersWithMetadata = users.map(user => {
    const roomId = ChatService.generateChatRoomId(AppState.currentUser.uid, user.uid);
    const room = roomsCache[roomId] || {};
    return {
      ...user,
      lastMessageTime: room.lastMessageTime?.toDate?.() || new Date(0),
      unreadCount: room[`unreadCount_${AppState.currentUser.uid}`] || 0,
      lastMessage: room.lastMessage || 'No messages yet'
    };
  });

  // Sort by last message time (descending)
  usersWithMetadata.sort((a, b) => b.lastMessageTime - a.lastMessageTime);

  usersList.innerHTML = usersWithMetadata.map(user => {
    const isActive = AppState.currentChatUser && AppState.currentChatUser.uid === user.uid;

    return `
      <div onclick="window.openChat('${user.uid}')" 
        class="p-4 ${isActive ? 'bg-indigo-50 dark:bg-indigo-900/20 border-r-4 border-indigo-600' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'} cursor-pointer transition-all group relative">
        <div class="flex items-center gap-3">
          <div class="relative shrink-0">
            <img src="${user.profilePicture || 'https://www.w3schools.com/howto/img_avatar.png'}" 
                 class="w-12 h-12 rounded-xl object-cover border-2 ${isActive ? 'border-indigo-200 dark:border-indigo-800' : 'border-transparent group-hover:border-indigo-100 dark:group-hover:border-indigo-900'} transition-all">
            <div class="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-dark-card rounded-full"></div>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex justify-between items-baseline mb-0.5">
              <p class="font-bold ${isActive ? 'text-indigo-900 dark:text-white' : 'text-slate-900 dark:text-white'} truncate text-sm">${Validators.escapeHTML(user.displayName)}</p>
              <span class="text-[10px] text-slate-400 font-medium">${user.unreadCount > 0 ? '' : 'Online'}</span>
            </div>
            <div class="flex justify-between items-center">
              <p class="text-xs ${user.unreadCount > 0 || isActive ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500'} truncate flex-1">
                ${Validators.escapeHTML(user.lastMessage)}
              </p>
              ${user.unreadCount > 0 ? `
                <span class="ml-2 w-5 h-5 bg-indigo-600 text-white text-[10px] flex items-center justify-center rounded-full font-bold animate-bounce">
                  ${user.unreadCount}
                </span>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
};

window.openChat = async (userId) => {
  console.log('Initiating handshake with identity:', userId);
  const isMobile = window.innerWidth < 1024;
  const chatPage = document.getElementById('chatPage');

  if (!userId) {
    console.warn('Handshake failed: No identity specified.');
    return;
  }

  if (chatPage && chatPage.classList.contains('hidden')) {
    window.navigateTo('chat');
  }

  const user = usersCache.find(u => u.uid === userId);
  if (!user) {
    // Fallback if not in cache (e.g. initial load)
    const profile = await UserService.getUserProfile(userId);
    if (!profile) return;
    AppState.currentChatUser = profile;
  } else {
    AppState.currentChatUser = user;
  }

  // Show loading state
  const chatMessages = document.getElementById('chatMessages');
  if (chatMessages) {
    chatMessages.innerHTML = '<div class="p-4 text-center text-gray-400">Synchronizing connection...</div>';
  }

  // Update header immediately
  window.updateChatHeader(AppState.currentChatUser);

  // Show conversation on mobile
  if (isMobile) {
    const chatMain = document.getElementById('chatMain');
    if (chatMain) {
      chatMain.classList.remove('translate-x-full');
      chatMain.style.transform = 'translateX(0)'; // Force immediate transform
    }
    document.body.style.overflow = 'hidden'; // Lock scroll
  }

  // Unsubscribe from previous listeners
  if (unsubscribeChat) unsubscribeChat();
  if (unsubscribeTyping) unsubscribeTyping();

  // Load messages in parallel 
  const messages = await ChatService.getMessages(AppState.currentUser.uid, userId, 50);
  window.displayMessages(messages);

  ChatService.markMessagesAsRead(AppState.currentUser.uid, userId, AppState.currentUser.uid);

  // Message listener
  unsubscribeChat = ChatService.onMessagesChange(AppState.currentUser.uid, userId, (updatedMessages) => {
    if (updatedMessages.length !== messages.length) {
      window.displayMessages(updatedMessages);
    }
  });

  // Typing listener
  unsubscribeTyping = ChatService.onTypingStatusChange(AppState.currentUser.uid, userId, userId, (isTyping) => {
    window.updateChatHeader(currentChatUser, isTyping);
  });
};

window.closeChat = () => {
  if (window.innerWidth < 1024) {
    const chatMain = document.getElementById('chatMain');
    if (chatMain) {
      chatMain.classList.add('translate-x-full');
      chatMain.style.transform = ''; // Clear forced transform
    }
    document.body.style.overflow = ''; // Unlock scroll
  }
};

window.handleTyping = () => {
  if (!AppState.currentChatUser) return;

  // Broadcast typing status
  ChatService.setTypingStatus(AppState.currentUser.uid, AppState.currentChatUser.uid, true);

  // Clear previous timeout
  if (typingTimeout) clearTimeout(typingTimeout);

  // Set timeout to stop typing status after 3 seconds of inactivity
  typingTimeout = setTimeout(() => {
    ChatService.setTypingStatus(AppState.currentUser.uid, AppState.currentChatUser.uid, false);
  }, 3000);
};

window.updateChatHeader = (user, isTyping = false) => {
  const chatHeader = document.getElementById('chatHeader');
  if (chatHeader) {
    chatHeader.innerHTML = `
      <div class="flex items-center gap-3 animate-fade-in text-slate-900 dark:text-white">
        <div class="relative">
          <img src="${user.profilePicture || 'https://www.w3schools.com/howto/img_avatar.png'}" 
               class="w-10 h-10 rounded-xl object-cover border-2 border-indigo-100 dark:border-indigo-900 transition-all duration-500">
          <div class="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-dark-card rounded-full"></div>
        </div>
        <div>
          <h3 class="font-bold text-sm">${Validators.escapeHTML(user.displayName)}</h3>
          <div class="flex items-center gap-1.5">
            ${isTyping ?
        `<span class="text-[10px] text-indigo-500 font-bold animate-pulse uppercase tracking-tight italic">Transmitting data...</span>` :
        `<span class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
               <p class="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Active Connection</p>`
      }
          </div>
        </div>
      </div>
    `;
  }
};

window.openAttachment = (data) => {
  const win = window.open();
  win.document.write(`<img src="${data}" style="max-width: 100%; height: auto;">`);
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
    const timeStr = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isMe = msg.senderId === AppState.currentUser.uid;

    let attachmentHtml = '';
    if (msg.attachment) {
      if (msg.attachment.type.startsWith('image/')) {
        attachmentHtml = `
            <div class="mt-2 rounded-lg overflow-hidden border border-slate-200 dark:border-dark-border cursor-pointer">
              <img src="${msg.attachment.data}" alt="${msg.attachment.name}" class="max-w-full max-h-60 object-cover" 
                   onclick="window.openAttachment('${msg.attachment.data}')">
            </div>
          `;
      } else {
        attachmentHtml = `
            <div class="mt-2 p-3 bg-white/50 dark:bg-black/20 rounded-lg flex items-center gap-3 border border-slate-200/50 dark:border-white/5">
              <div class="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 rounded flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <i class="fas fa-file-download text-lg"></i>
              </div>
              <div class="overflow-hidden">
                <p class="text-[11px] font-bold text-slate-700 dark:text-white truncate">${Validators.escapeHTML(msg.attachment.name)}</p>
                <p class="text-[9px] text-slate-500">${msg.attachment.size}</p>
                <a href="${msg.attachment.data}" download="${msg.attachment.name}" class="text-[9px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline">DOWNLOAD RESOURCE</a>
              </div>
            </div>
          `;
      }
    }

    return `
        <div class="flex ${isMe ? 'justify-end' : 'justify-start'} animate-slide-up">
          <div class="max-w-[80%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1">
            <div class="${isMe ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-none' : 'bg-white dark:bg-dark-card text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-dark-border rounded-2xl rounded-tl-none'} p-3 shadow-sm shadow-slate-200/50 dark:shadow-none">
              ${msg.message ? `<p class="text-sm font-medium leading-relaxed">${Validators.escapeHTML(msg.message)}</p>` : ''}
              ${attachmentHtml}
            </div>
            <div class="flex items-center gap-1.5 px-1">
              <span class="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">${timeStr}</span>
              ${isMe ? `<i class="fas ${msg.read ? 'fa-check-double text-indigo-500' : 'fa-check text-slate-300'} text-[8px]"></i>` : ''}
            </div>
          </div>
        </div>
      `;
  }).join('');

  // Auto scroll to bottom
  setTimeout(() => {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }, 0);
};

let selectedAttachment = null;

window.handleChatAttachmentSelect = (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  // New limit: 750KB (Base64 overhead fits within 1MB Firestore limit)
  if (file.size > 750 * 1024) {
    UIHelper.showAlert('File must be less than 750KB to ensure secure transmission', 'error');
    event.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    selectedAttachment = {
      name: file.name,
      size: (file.size / 1024).toFixed(1) + ' KB',
      type: file.type,
      data: e.target.result, // base64 for local preview
      file: file // raw file for Storage upload
    };

    if (file.size > 1024 * 1024) {
      selectedAttachment.size = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    }

    document.getElementById('attachmentName').textContent = selectedAttachment.name;
    document.getElementById('attachmentSize').textContent = selectedAttachment.size;
    document.getElementById('attachmentPreview').classList.remove('hidden');
  };
  reader.readAsDataURL(file);
};

window.clearChatAttachment = () => {
  selectedAttachment = null;
  const input = document.getElementById('chatAttachmentInput');
  if (input) input.value = '';
  document.getElementById('attachmentPreview').classList.add('hidden');
};

window.sendMessage = async () => {
  const sendBtn = document.querySelector('button[onclick="window.sendMessage()"]');
  const sendIcon = sendBtn?.querySelector('i');

  try {
    if (!AppState.currentChatUser || !AppState.currentUser) {
      UIHelper.showAlert('Please select a recipient from the terminal directory first.', 'warning');
      return;
    }

    const input = document.getElementById('messageInput');
    const text = input.value.trim();

    if (!text && !selectedAttachment) return;

    // Loading state
    if (sendBtn) sendBtn.disabled = true;
    if (sendIcon) {
      sendIcon.className = 'fas fa-spinner fa-spin';
    }

    let attachmentData = null;
    if (selectedAttachment) {
      console.log('Initiating resource transmission...', selectedAttachment.name);
      UIHelper.showAlert('Transmitting resource to cloud node...', 'success');

      const storagePath = `chats/${AppState.currentUser.uid}/${Date.now()}_${selectedAttachment.name}`;
      const storageRef = ref(storage, storagePath);

      const snapshot = await uploadBytes(storageRef, selectedAttachment.file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      console.log('Resource synchronized successfully:', downloadURL);

      attachmentData = {
        name: selectedAttachment.name,
        size: selectedAttachment.size,
        type: selectedAttachment.type,
        data: downloadURL
      };
    }

    const messageData = {
      text: text,
      attachment: attachmentData
    };

    // If no text but has attachment, set a placeholder for last message metadata
    const lastDisplayMessage = text || (attachmentData ? `[Attachment: ${attachmentData.name}]` : '');

    await ChatService.sendMessage(AppState.currentUser.uid, AppState.currentChatUser.uid, {
      ...messageData,
      lastMessageDisplay: lastDisplayMessage // Helpful for sorting
    });

    input.value = '';
    window.clearChatAttachment();
    console.log('Full message packet synchronized.');
  } catch (error) {
    console.error('Handshake/Transmission Error:', error);
    UIHelper.showAlert('Communication failure: ' + (error.message || 'System offline'), 'error');
  } finally {
    if (sendBtn) sendBtn.disabled = false;
    if (sendIcon) {
      sendIcon.className = 'fas fa-paper-plane text-lg translate-x-0.5';
    }
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
