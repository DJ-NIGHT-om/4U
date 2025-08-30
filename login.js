// Login system script
(function() {
    'use strict';
    
    /* @tweakable The username for the application administrator. */
    const ADMIN_USERNAME = 'DJNIGHT2';
    /* @tweakable The password for the application administrator. */
    const ADMIN_PASSWORD = 'DJNIGHT3311';
    
    // Register service worker for offline functionality
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
            navigator.serviceWorker.register('./sw.js')
                .then(function(registration) {
                    console.log('ServiceWorker registration successful');
                })
                .catch(function(error) {
                    console.log('ServiceWorker registration failed');
                });
        });
    }

    document.addEventListener('DOMContentLoaded', function() {
        var loginForm = document.getElementById('login-form');
        var registerForm = document.getElementById('register-form');
        var resetForm = document.getElementById('reset-form');
        var registerBtn = document.getElementById('register-btn');
        var registerFormSection = document.getElementById('register-form-section');
        var resetPasswordSection = document.getElementById('reset-password-section');
        var cancelRegisterBtn = document.getElementById('cancel-register');
        var cancelResetBtn = document.getElementById('cancel-reset');
        var loadingOverlay = document.getElementById('loading-overlay');
        
        /* @tweakable If true, a loading indicator will show while authenticating. Set to false for instant redirects on success. */
        const showLoadingOnAuth = false;

        var loginAttempts = 0;
        var maxLoginAttempts = 3;

        // Check if user is already logged in
        var currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
            window.location.href = 'index.html';
            return;
        }

        // The showLoading function in ui.js now has a built-in timeout,
        // so explicit hiding is no longer necessary in most cases here.
        // The loading screen will show for a maximum of 1 second.
        
        function showRegisterForm() {
            document.getElementById('login-section').classList.add('hidden');
            registerFormSection.classList.remove('hidden');
        }

        function hideRegisterForm() {
            document.getElementById('login-section').classList.remove('hidden');
            registerFormSection.classList.add('hidden');
        }

        function showResetForm() {
            document.getElementById('login-section').classList.add('hidden');
            resetPasswordSection.classList.remove('hidden');
        }

        function hideResetForm() {
            document.getElementById('login-section').classList.remove('hidden');
            resetPasswordSection.classList.add('hidden');
        }

        function authenticateUser(username, password) {
            return window.postDataToSheet({
                action: 'authenticate',
                username: username,
                password: password
            });
        }

        function registerUser(username, password) {
            return window.postDataToSheet({
                action: 'register',
                username: username,
                password: password
            });
        }

        function resetPassword(username, newPassword) {
            return window.postDataToSheet({
                action: 'resetPassword',
                username: username,
                password: newPassword
            });
        }

        // Login form handler
        if (loginForm) {
            loginForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                var username = document.getElementById('username').value.trim();
                var password = document.getElementById('password').value.trim();
                
                if (!username || !password) {
                    window.showAlert('يرجى إدخال اسم المستخدم وكلمة المرور');
                    return;
                }

                // Admin login check
                if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
                    localStorage.setItem('currentUser', username);
                    localStorage.setItem('currentUserPassword', password);
                    localStorage.setItem('isAdmin', 'true');
                    window.location.href = 'index.html';
                    return;
                }

                if (showLoadingOnAuth) {
                    window.showLoading(true);
                }
                
                authenticateUser(username, password)
                    .then(function(result) {
                        if (result.status === 'success') {
                            localStorage.setItem('currentUser', username);
                            localStorage.setItem('currentUserPassword', password);
                            localStorage.removeItem('isAdmin'); // Ensure not set for regular users
                            window.location.href = 'index.html';
                        } else {
                            if (showLoadingOnAuth) window.showLoading(false);
                            loginAttempts++;
                            if (loginAttempts >= maxLoginAttempts) {
                                window.showAlert('تم تجاوز عدد المحاولات المسموح. يرجى إعادة تعيين كلمة المرور.');
                                showResetForm();
                            } else {
                                window.showAlert('اسم المستخدم أو كلمة المرور غير صحيحة. المحاولة ' + loginAttempts + ' من ' + maxLoginAttempts);
                            }
                        }
                    })
                    .catch(function(error) {
                        if (showLoadingOnAuth) window.showLoading(false);
                        console.error('Login error:', error);
                        window.showAlert('حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.');
                    })
                    .finally(function() {
                        // The loading indicator is now hidden automatically by a timeout in showLoading.
                    });
            });
        }

        // Register form handler - now handles inline form instead of modal
        if (registerBtn) {
            registerBtn.addEventListener('click', function() {
                showRegisterForm();
            });
        }

        // Handle inline register form submission
        if (registerForm) {
            registerForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                var username = document.getElementById('new-username').value.trim();
                var password = document.getElementById('new-user-password').value.trim();
                var confirmPassword = document.getElementById('confirm-user-password').value.trim();
                
                if (!username || !password || !confirmPassword) {
                    window.showAlert('يرجى ملء جميع الحقول');
                    return;
                }

                if (password !== confirmPassword) {
                    window.showAlert('كلمة المرور وتأكيد كلمة المرور غير متطابقتين');
                    return;
                }

                if (password.length < 6) {
                    window.showAlert('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
                    return;
                }

                if (showLoadingOnAuth) {
                    window.showLoading(true);
                }
                
                registerUser(username, password)
                    .then(function(result) {
                        if (result.status === 'success') {
                            localStorage.setItem('currentUser', username);
                            localStorage.setItem('currentUserPassword', password);
                            // No alert needed, just redirect
                            window.location.href = 'index.html';
                        } else {
                            if (showLoadingOnAuth) window.showLoading(false);
                            window.showAlert(result.message || 'حدث خطأ أثناء إنشاء الحساب');
                        }
                    })
                    .catch(function(error) {
                        if (showLoadingOnAuth) window.showLoading(false);
                        console.error('Registration error:', error);
                        window.showAlert('حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مرة أخرى.');
                    })
                    .finally(function() {
                        // The loading indicator is now hidden automatically by a timeout in showLoading.
                    });
            });
        }

        // Reset password form handler
        if (resetForm) {
            resetForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                var username = document.getElementById('reset-username').value.trim();
                var newPassword = document.getElementById('new-password').value.trim();
                var confirmPassword = document.getElementById('confirm-password').value.trim();
                
                if (!username || !newPassword || !confirmPassword) {
                    window.showAlert('يرجى ملء جميع الحقول');
                    return;
                }

                if (newPassword !== confirmPassword) {
                    window.showAlert('كلمة المرور الجديدة وتأكيد كلمة المرور غير متطابقتين');
                    return;
                }

                if (newPassword.length < 6) {
                    window.showAlert('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
                    return;
                }

                if (showLoadingOnAuth) {
                    window.showLoading(true);
                }
                
                resetPassword(username, newPassword)
                    .then(function(result) {
                        if (result.status === 'success') {
                            localStorage.setItem('currentUserPassword', newPassword);
                            window.showAlert('تم إعادة تعيين كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول.');
                            hideResetForm();
                            resetForm.reset();
                            loginAttempts = 0;
                        } else {
                            if (showLoadingOnAuth) window.showLoading(false);
                            window.showAlert(result.message || 'حدث خطأ أثناء إعادة تعيين كلمة المرور');
                        }
                    })
                    .catch(function(error) {
                        if (showLoadingOnAuth) window.showLoading(false);
                        console.error('Reset password error:', error);
                        window.showAlert('حدث خطأ أثناء إعادة تعيين كلمة المرور. يرجى المحاولة مرة أخرى.');
                    })
                    .finally(function() {
                        // The loading indicator is now hidden automatically by a timeout in showLoading.
                    });
            });
        }

        // Event listeners for buttons
        if (cancelRegisterBtn) {
            cancelRegisterBtn.addEventListener('click', hideRegisterForm);
        }

        if (cancelResetBtn) {
            cancelResetBtn.addEventListener('click', hideResetForm);
        }

        // Initial setup
        window.showLoading(false); // Hide initially on page load
    });
})();