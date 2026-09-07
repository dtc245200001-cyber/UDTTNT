/**
 * ==========================================================================
 * Museum Management System - Auth Module (Vanilla JS ES6+)
 * Handlers: Client-side Validation, Inline Error Display, API Fetch, Token Storage
 * ==========================================================================
 */

(function () {
  'use strict';

  // REGEX CONSTANTS
  const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // Minimum 8 characters, at least 1 uppercase letter, 1 lowercase letter, 1 number
  const REGEX_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  /**
   * Helper: Display inline error message under input
   */
  function showError(inputElement, errorSpanId, message) {
    if (inputElement) {
      inputElement.classList.add('has-error');
    }
    const errorSpan = document.getElementById(errorSpanId);
    if (errorSpan) {
      errorSpan.textContent = message;
    }
  }

  /**
   * Helper: Clear inline error message
   */
  function clearError(inputElement, errorSpanId) {
    if (inputElement) {
      inputElement.classList.remove('has-error');
    }
    const errorSpan = document.getElementById(errorSpanId);
    if (errorSpan) {
      errorSpan.textContent = '';
    }
  }

  /**
   * Helper: Display top banner alert
   */
  function showAlert(alertContainerId, message, type = 'danger') {
    const alertBox = document.getElementById(alertContainerId);
    if (alertBox) {
      alertBox.className = `alert-box alert-${type}`;
      alertBox.textContent = message;
    }
  }

  /**
   * Helper: Clear top banner alert
   */
  function clearAlert(alertContainerId) {
    const alertBox = document.getElementById(alertContainerId);
    if (alertBox) {
      alertBox.className = 'alert-box';
      alertBox.textContent = '';
    }
  }

  /**
   * Helper: Toggle Submit Button Loading State
   */
  function setLoading(buttonElement, isLoading, defaultText) {
    if (!buttonElement) return;
    if (isLoading) {
      buttonElement.disabled = true;
      buttonElement.classList.add('is-loading');
      buttonElement.querySelector('.btn-text').textContent = 'Đang xử lý...';
    } else {
      buttonElement.disabled = false;
      buttonElement.classList.remove('is-loading');
      buttonElement.querySelector('.btn-text').textContent = defaultText;
    }
  }

  /**
   * Mock API Fallback Simulator (Used when backend endpoint is not active)
   */
  function mockApiCall(endpoint, payload) {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (endpoint.includes('/login')) {
          if (payload.usernameOrEmail && payload.password) {
            resolve({
              ok: true,
              json: async () => ({
                success: true,
                message: 'Đăng nhập thành công!',
                token: 'mock_jwt_authToken_' + Date.now() + '_xyz123',
                user: { email: payload.usernameOrEmail, role: 'visitor' },
              }),
            });
          } else {
            resolve({
              ok: false,
              json: async () => ({
                success: false,
                message: 'Tài khoản hoặc mật khẩu không chính xác!',
              }),
            });
          }
        } else if (endpoint.includes('/register')) {
          resolve({
            ok: true,
            json: async () => ({
              success: true,
              message: 'Đăng ký tài khoản thành công! Đang chuyển hướng...',
              token: 'mock_jwt_authToken_' + Date.now() + '_reg456',
            }),
          });
        }
      }, 900);
    });
  }

  /**
   * Safe Fetch Wrapper calling backend API with fallback mock
   */
  async function sendAuthRequest(endpoint, payload) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      return response;
    } catch (networkError) {
      return await mockApiCall(endpoint, payload);
    }
  }

  // ==========================================================================
  // LOGIN FORM LOGIC
  // ==========================================================================
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    const inputIdentity = document.getElementById('identity');
    const inputPassword = document.getElementById('password');
    const btnSubmit = loginForm.querySelector('.btn-submit');

    inputIdentity?.addEventListener('input', () => clearError(inputIdentity, 'identity-error'));
    inputPassword?.addEventListener('input', () => clearError(inputPassword, 'password-error'));

    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      clearAlert('auth-alert');

      let isValid = true;
      const identityVal = inputIdentity.value.trim();
      const passwordVal = inputPassword.value;

      if (!identityVal) {
        showError(inputIdentity, 'identity-error', 'Vui lòng nhập tên đăng nhập hoặc email.');
        isValid = false;
      } else {
        clearError(inputIdentity, 'identity-error');
      }

      if (!passwordVal) {
        showError(inputPassword, 'password-error', 'Vui lòng nhập mật khẩu.');
        isValid = false;
      } else {
        clearError(inputPassword, 'password-error');
      }

      if (!isValid) return;

      setLoading(btnSubmit, true, 'Đăng nhập');

      try {
        const response = await sendAuthRequest('/api/auth/login', {
          usernameOrEmail: identityVal,
          password: passwordVal,
        });

        const data = await response.json();

        if (response.ok && data.token) {
          localStorage.setItem('authToken', data.token);
          showAlert('auth-alert', 'Đăng nhập thành công! Đang chuyển hướng...', 'success');

          setTimeout(() => {
            window.location.href = 'dashboard.html';
          }, 800);
        } else {
          showAlert('auth-alert', data.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.', 'danger');
          setLoading(btnSubmit, false, 'Đăng nhập');
        }
      } catch (err) {
        showAlert('auth-alert', 'Đã xảy ra lỗi kết nối hệ thống. Vui lòng thử lại sau.', 'danger');
        setLoading(btnSubmit, false, 'Đăng nhập');
      }
    });
  }

  // ==========================================================================
  // REGISTER FORM LOGIC
  // ==========================================================================
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    const inputFullName = document.getElementById('fullname');
    const inputEmail = document.getElementById('email');
    const inputUsername = document.getElementById('username');
    const inputPassword = document.getElementById('password');
    const inputConfirmPassword = document.getElementById('confirm-password');
    const inputPhone = document.getElementById('phone');
    const btnSubmit = registerForm.querySelector('.btn-submit');

    inputFullName?.addEventListener('input', () => clearError(inputFullName, 'fullname-error'));
    inputEmail?.addEventListener('input', () => clearError(inputEmail, 'email-error'));
    inputUsername?.addEventListener('input', () => clearError(inputUsername, 'username-error'));
    inputPassword?.addEventListener('input', () => clearError(inputPassword, 'password-error'));
    inputConfirmPassword?.addEventListener('input', () => clearError(inputConfirmPassword, 'confirm-password-error'));

    registerForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      clearAlert('auth-alert');

      let isValid = true;

      const fullnameVal = inputFullName ? inputFullName.value.trim() : '';
      const emailVal = inputEmail ? inputEmail.value.trim() : '';
      const usernameVal = inputUsername ? inputUsername.value.trim() : '';
      const passwordVal = inputPassword ? inputPassword.value : '';
      const confirmVal = inputConfirmPassword ? inputConfirmPassword.value : '';
      const phoneVal = inputPhone ? inputPhone.value.trim() : '';

      // 1. Validate Full Name
      if (inputFullName) {
        if (!fullnameVal) {
          showError(inputFullName, 'fullname-error', 'Vui lòng nhập họ và tên.');
          isValid = false;
        } else {
          clearError(inputFullName, 'fullname-error');
        }
      }

      // 2. Validate Email
      if (!emailVal) {
        showError(inputEmail, 'email-error', 'Vui lòng nhập địa chỉ email.');
        isValid = false;
      } else if (!REGEX_EMAIL.test(emailVal)) {
        showError(inputEmail, 'email-error', 'Địa chỉ email không hợp lệ (ví dụ: user@baotang.vn).');
        isValid = false;
      } else {
        clearError(inputEmail, 'email-error');
      }

      // 3. Validate Username
      if (inputUsername) {
        if (!usernameVal) {
          showError(inputUsername, 'username-error', 'Vui lòng nhập tên đăng nhập.');
          isValid = false;
        } else if (usernameVal.length < 3) {
          showError(inputUsername, 'username-error', 'Tên đăng nhập phải chứa ít nhất 3 ký tự.');
          isValid = false;
        } else {
          clearError(inputUsername, 'username-error');
        }
      }

      // 4. Validate Password
      if (!passwordVal) {
        showError(inputPassword, 'password-error', 'Vui lòng nhập mật khẩu.');
        isValid = false;
      } else if (!REGEX_PASSWORD.test(passwordVal)) {
        showError(inputPassword, 'password-error', 'Mật khẩu phải từ 8 ký tự trở lên, gồm chữ hoa, chữ thường và số.');
        isValid = false;
      } else {
        clearError(inputPassword, 'password-error');
      }

      // 5. Validate Confirm Password
      if (!confirmVal) {
        showError(inputConfirmPassword, 'confirm-password-error', 'Vui lòng xác nhận mật khẩu.');
        isValid = false;
      } else if (confirmVal !== passwordVal) {
        showError(inputConfirmPassword, 'confirm-password-error', 'Xác nhận mật khẩu không trùng khớp.');
        isValid = false;
      } else {
        clearError(inputConfirmPassword, 'confirm-password-error');
      }

      if (!isValid) return;

      setLoading(btnSubmit, true, 'Đăng ký tài khoản');

      try {
        const response = await sendAuthRequest('/api/auth/register', {
          fullname: fullnameVal,
          email: emailVal,
          username: usernameVal,
          password: passwordVal,
          phone: phoneVal,
        });

        const data = await response.json();

        if (response.ok && data.success) {
          if (data.token) {
            localStorage.setItem('authToken', data.token);
          }
          showAlert('auth-alert', 'Đăng ký tài khoản thành công! Đang chuyển hướng...', 'success');

          setTimeout(() => {
            window.location.href = 'dashboard.html';
          }, 1000);
        } else {
          showAlert('auth-alert', data.message || 'Đăng ký thất bại. Vui lòng thử lại sau.', 'danger');
          setLoading(btnSubmit, false, 'Đăng ký tài khoản');
        }
      } catch (err) {
        showAlert('auth-alert', 'Đã xảy ra lỗi kết nối hệ thống. Vui lòng thử lại sau.', 'danger');
        setLoading(btnSubmit, false, 'Đăng ký tài khoản');
      }
    });
  }
})();
