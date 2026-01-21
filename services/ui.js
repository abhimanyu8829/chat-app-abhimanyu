// ===============================
// UI SERVICE
// ===============================

export const UIHelper = {
  showAlert(message, type = 'success') {
    const alertBox = document.getElementById('alertBox');
    if (!alertBox) return;

    alertBox.textContent = message; // textContent is already safe, but let's be consistent or use innerHTML if we wanted icons
    // However, if we want to allow some HTML (like icons), we should sanitize first.
    // Given the current use, textContent is safest.
    alertBox.textContent = message;
    alertBox.className = `alert ${type} active`;

    // Ensure it's visible
    alertBox.style.opacity = '1';
    alertBox.style.pointerEvents = 'auto';

    // Dismiss after 3 seconds
    setTimeout(() => {
      alertBox.classList.remove('active');
      alertBox.style.opacity = '0';
      alertBox.style.pointerEvents = 'none';
    }, 3000);
  },

  updatePasswordRequirements(password) {
    const Validators = window.Validators;
    const validation = Validators.isValidPassword(password);

    const reqLength = document.getElementById('req-length');
    const reqUppercase = document.getElementById('req-uppercase');
    const reqNumber = document.getElementById('req-number');
    const reqSpecial = document.getElementById('req-special');

    if (reqLength) reqLength.classList.toggle('valid', validation.length);
    if (reqUppercase) reqUppercase.classList.toggle('valid', validation.uppercase);
    if (reqNumber) reqNumber.classList.toggle('valid', validation.number);
    if (reqSpecial) reqSpecial.classList.toggle('valid', validation.special);
  },

  applyTheme(theme) {
    if (theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }
};

// Set up real-time validation
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('regPassword')?.addEventListener('input', (e) => {
    UIHelper.updatePasswordRequirements(e.target.value);
  });

  document.getElementById('regEmail')?.addEventListener('blur', (e) => {
    window.Validators.validateEmail(e.target.value, 'regEmail');
  });

  document.getElementById('loginEmail')?.addEventListener('blur', (e) => {
    window.Validators.validateEmail(e.target.value, 'loginEmail');
  });

  document.getElementById('resetEmail')?.addEventListener('blur', (e) => {
    window.Validators.validateEmail(e.target.value, 'resetEmail');
  });

  document.getElementById('profileFirstName')?.addEventListener('blur', (e) => {
    window.Validators.validateName(e.target.value, 'profileFirstName');
  });

  document.getElementById('profileLastName')?.addEventListener('blur', (e) => {
    window.Validators.validateName(e.target.value, 'profileLastName');
  });
});
