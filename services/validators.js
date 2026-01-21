// ===============================
// VALIDATORS
// ===============================

export const Validators = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^[+]?[(]?[0-9]{3}[)]?[-\s]?[0-9]{3}[-\s]?[0-9]{4,6}$/,

  isValidEmail(email) {
    return this.EMAIL_REGEX.test(email.trim());
  },

  isValidPhone(phone) {
    return !phone || this.PHONE_REGEX.test(phone.trim());
  },

  isValidPassword(password) {
    return {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      isValid:
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[0-9]/.test(password) &&
        /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
  },

  isValidName(name) {
    return name.trim().length >= 2 && name.trim().length <= 50;
  },

  validateEmail(email, fieldId) {
    const inputElement = document.getElementById(fieldId);
    const errorElement = inputElement?.nextElementSibling;

    if (!email.trim()) {
      this.showError(inputElement, errorElement, 'Email is required');
      return false;
    }

    if (!this.isValidEmail(email)) {
      this.showError(inputElement, errorElement, 'Please enter a valid email address');
      return false;
    }

    this.clearError(inputElement, errorElement);
    return true;
  },

  validatePassword(password, fieldId) {
    const inputElement = document.getElementById(fieldId);
    const errorElement = inputElement?.nextElementSibling;

    if (!password) {
      this.showError(inputElement, errorElement, 'Password is required');
      return false;
    }

    const validation = this.isValidPassword(password);
    if (!validation.isValid) {
      this.showError(inputElement, errorElement, 'Password does not meet requirements');
      return false;
    }

    this.clearError(inputElement, errorElement);
    return true;
  },

  validatePasswordMatch(password, confirmPassword, fieldId) {
    const inputElement = document.getElementById(fieldId);
    const errorElement = inputElement?.nextElementSibling;

    if (password !== confirmPassword) {
      this.showError(inputElement, errorElement, 'Passwords do not match');
      return false;
    }

    this.clearError(inputElement, errorElement);
    return true;
  },

  validateName(name, fieldId) {
    const inputElement = document.getElementById(fieldId);
    const errorElement = inputElement?.nextElementSibling;

    if (!name.trim()) {
      this.showError(inputElement, errorElement, 'Name is required');
      return false;
    }

    if (!this.isValidName(name)) {
      this.showError(inputElement, errorElement, 'Name must be 2-50 characters');
      return false;
    }

    this.clearError(inputElement, errorElement);
    return true;
  },

  showError(input, errorElement, message) {
    input?.classList.add('error');
    if (errorElement && errorElement.classList.contains('error-message')) {
      errorElement.textContent = message;
      errorElement.classList.add('active');
    }
  },

  clearError(input, errorElement) {
    input?.classList.remove('error');
    if (errorElement && errorElement.classList.contains('error-message')) {
      errorElement.classList.remove('active');
    }
  },

  escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};
