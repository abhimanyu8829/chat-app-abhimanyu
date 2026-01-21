// ===============================
// APP STATE MANAGEMENT
// ===============================

export const AppState = {
  currentUser: null,
  userProfile: null,
  isLoading: false,
  currentPage: 'auth',

  setLoading(state) {
    this.isLoading = state;
    this.updateButtonStates();
  },

  setCurrentUser(user) {
    this.currentUser = user;
  },

  setUserProfile(profile) {
    this.userProfile = profile;
  },

  setCurrentPage(page) {
    this.currentPage = page;
  },

  updateButtonStates() {
    const buttons = document.querySelectorAll('button[onclick], button[type="button"]');
    buttons.forEach(btn => {
      if (!btn.classList.contains('nav-btn')) {
        btn.disabled = this.isLoading;
      }
    });
  },

  async updateUI() {
    if (this.currentUser) {
      try {
        const profile = await window.UserService.getUserProfile(this.currentUser.uid);
        this.setUserProfile(profile);
        this.showPage('dashboardContainer');
        await this.updateDashboard(profile);
      } catch (error) {
        console.error('Failed to update UI', error);
      }
    } else {
      this.showPage('auth');
    }
  },

  showPage(page) {
    const pages = ['authContainer', 'dashboardContainer'];
    pages.forEach(p => {
      const el = document.getElementById(p);
      if (el) el.classList.add('hidden');
    });

    const pageEl = document.getElementById(page);
    if (pageEl) pageEl.classList.remove('hidden');

    this.currentPage = page;
  },

  async updateDashboard(profile) {
    if (!profile) return;

    // Update all dashboard elements
    const elements = {
      'dashboardUserEmail': profile.email,
      'dashboardUserName': profile.displayName,
      'summaryUserName': profile.displayName,
      'loginCount': profile.metadata?.loginCount || 0,
      'profileEmail': profile.email,
      'breadcrumbCurrent': this.currentPage === 'dashboardContainer' ? 'Dashboard' : 'Identity'
    };

    Object.entries(elements).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el && !id.includes('Picture')) el.textContent = value;
    });

    // Update profile pictures across multiple components
    const pictureSelectors = [
      'dashboardUserPicture',
      'headerUserPicture',
      'summaryUserPicture',
      'profilePicturePreview'
    ];

    pictureSelectors.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.src = profile.profilePicture || 'https://www.w3schools.com/howto/img_avatar.png';
      }
    });

    // Join date
    let joinDateText = 'N/A';
    if (profile.metadata?.createdAt) {
      try {
        const date = profile.metadata.createdAt.toDate?.() || new Date(profile.metadata.createdAt);
        joinDateText = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      } catch (e) {
        joinDateText = 'N/A';
      }
    }
    const joinDateEl = document.getElementById('joinDate');
    if (joinDateEl) joinDateEl.textContent = joinDateText;

    // Update Audit Log
    try {
      const activities = await window.UserService.getActivityLog(profile.uid, 10);
      const activityFeed = document.getElementById('activityFeed');
      if (activityFeed && activities.length > 0) {
        activityFeed.innerHTML = activities.map(act => {
          const timestamp = act.timestamp?.toDate?.() || new Date(act.timestamp);
          const timeLabel = this.formatTimeAgo(timestamp);
          const icon = this.getActivityIcon(act.type);

          return `
            <div class="flex gap-4 animate-fade-in">
              <div class="relative shrink-0">
                <div class="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                  <i class="fas ${icon} text-slate-500"></i>
                </div>
              </div>
              <div>
                <p class="text-sm font-semibold text-slate-900 dark:text-white">${this.formatActivityTitle(act.type)}</p>
                <p class="text-xs text-slate-500 mt-1">${this.formatActivityDetails(act)}</p>
                <p class="text-[10px] text-slate-400 mt-2 font-medium uppercase tracking-tighter">${timeLabel}</p>
              </div>
            </div>
          `;
        }).join('');
      }
    } catch (error) {
      console.error('Failed to update activity feed', error);
    }
  },

  formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just Now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  },

  getActivityIcon(type) {
    const icons = {
      'login': 'fa-sign-in-alt',
      'profile_updated': 'fa-user-edit',
      'settings_updated': 'fa-cog',
      'profile_picture_uploaded': 'fa-image',
      'profile_picture_removed': 'fa-trash-alt'
    };
    return icons[type] || 'fa-info-circle';
  },

  formatActivityTitle(type) {
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  },

  formatActivityDetails(act) {
    if (act.type === 'login') return 'Handshake successful. Established secure session.';
    if (act.type === 'profile_updated') return 'Identity records synchronized.';
    if (act.type === 'settings_updated') return 'System preferences reconfigured.';
    return 'Cluster activity recorded.';
  }
};
