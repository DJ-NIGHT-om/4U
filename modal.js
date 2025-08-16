// Global modal functions for browser compatibility
(function() {
    'use strict';
    
    var modalOverlay = document.getElementById('custom-modal-overlay');
    var modalTitleElem = document.getElementById('modal-title');
    var modalMessageElem = document.getElementById('modal-message');
    var modalActionsElem = document.getElementById('modal-actions');
    var modalFormContent = document.getElementById('modal-form-content');

    /**
     * Displays a simple alert modal with a message and an "OK" button.
     * @param {string} message - The message to display.
     * @param {string} [title='تنبيه'] - The title of the modal.
     * @returns {Promise<void>} A promise that resolves when the user clicks "OK".
     */
    function showAlert(message, title) {
        title = title || 'تنبيه';
        if (modalTitleElem) modalTitleElem.textContent = title;
        if (modalMessageElem) modalMessageElem.textContent = message;
        if (modalActionsElem) modalActionsElem.innerHTML = '<button class="submit-btn">موافق</button>';
        if (modalOverlay) {
            modalOverlay.classList.remove('hidden');
            // Add entrance animation
            var modalContent = modalOverlay.querySelector('.modal-content');
            if (modalContent) {
                modalContent.style.animation = 'modalSlideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            }
        }

        return new Promise(function(resolve) {
            if (modalActionsElem) {
                var button = modalActionsElem.querySelector('button');
                if (button) {
                    button.onclick = function() {
                        if (modalOverlay) modalOverlay.classList.add('hidden');
                        resolve();
                    };
                    // Focus the button for better accessibility
                    setTimeout(function() { button.focus(); }, 100);
                }
            }
        });
    }

    /**
     * Displays a confirmation modal with "Confirm" and "Cancel" buttons.
     * @param {string} message - The confirmation message to display.
     * @param {string} [title='تأكيد'] - The title of the modal.
     * @returns {Promise<boolean>} A promise that resolves with `true` if confirmed, `false` if canceled.
     */
    function showConfirm(message, title) {
        title = title || 'تأكيد';
        if (modalTitleElem) modalTitleElem.textContent = title;
        if (modalMessageElem) modalMessageElem.textContent = message;
        if (modalActionsElem) {
            modalActionsElem.innerHTML = 
                '<button class="submit-btn" id="modal-confirm-btn">تأكيد</button>' +
                '<button class="cancel-btn" id="modal-cancel-btn">إلغاء</button>';
        }
        if (modalOverlay) {
            modalOverlay.classList.remove('hidden');
            // Add entrance animation
            var modalContent = modalOverlay.querySelector('.modal-content');
            if (modalContent) {
                modalContent.style.animation = 'modalSlideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            }
        }

        return new Promise(function(resolve) {
            var confirmBtn = document.getElementById('modal-confirm-btn');
            var cancelBtn = document.getElementById('modal-cancel-btn');

            if (confirmBtn) {
                confirmBtn.onclick = function() {
                    if (modalOverlay) modalOverlay.classList.add('hidden');
                    resolve(true);
                };
                // Focus the confirm button for better accessibility
                setTimeout(function() { confirmBtn.focus(); }, 100);
            }
            if (cancelBtn) {
                cancelBtn.onclick = function() {
                    if (modalOverlay) modalOverlay.classList.add('hidden');
                    resolve(false);
                };
            }
            
            // Allow ESC key to cancel
            var escHandler = function(e) {
                if (e.key === 'Escape') {
                    document.removeEventListener('keydown', escHandler);
                    if (modalOverlay) modalOverlay.classList.add('hidden');
                    resolve(false);
                }
            };
            document.addEventListener('keydown', escHandler);
        });
    }

    /**
     * Displays a registration form modal
     * @returns {Promise<object>} A promise that resolves with registration data or null if cancelled
     */
    function showRegistrationModal() {
        if (modalTitleElem) modalTitleElem.innerHTML = '<i class="fas fa-user-plus"></i> تسجيل مستخدم جديد';
        if (modalMessageElem) modalMessageElem.textContent = '';
        
        if (modalFormContent) {
            modalFormContent.innerHTML = `
                <form id="modal-register-form">
                    <div class="form-group">
                        <label for="modal-new-username"><i class="fas fa-user icon"></i> اسم المستخدم</label>
                        <input type="text" id="modal-new-username" required>
                    </div>
                    <div class="form-group">
                        <label for="modal-new-user-password"><i class="fas fa-lock icon"></i> كلمة المرور</label>
                        <input type="password" id="modal-new-user-password" required>
                    </div>
                    <div class="form-group">
                        <label for="modal-confirm-user-password"><i class="fas fa-lock icon"></i> تأكيد كلمة المرور</label>
                        <input type="password" id="modal-confirm-user-password" required>
                    </div>
                </form>
            `;
        }
        
        if (modalActionsElem) {
            modalActionsElem.innerHTML = 
                '<button class="submit-btn green-btn" id="modal-register-submit-btn"><i class="fas fa-user-plus"></i> إنشاء الحساب</button>' +
                '<button class="cancel-btn" id="modal-register-cancel-btn"><i class="fas fa-times"></i> إلغاء</button>';
        }
        
        if (modalOverlay) {
            modalOverlay.classList.remove('hidden');
            // Add entrance animation
            var modalContent = modalOverlay.querySelector('.modal-content');
            if (modalContent) {
                modalContent.style.animation = 'modalSlideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            }
        }

        return new Promise(function(resolve) {
            var submitBtn = document.getElementById('modal-register-submit-btn');
            var cancelBtn = document.getElementById('modal-register-cancel-btn');
            var usernameInput = document.getElementById('modal-new-username');
            var passwordInput = document.getElementById('modal-new-user-password');
            var confirmPasswordInput = document.getElementById('modal-confirm-user-password');

            function cleanup() {
                if (modalOverlay) modalOverlay.classList.add('hidden');
                if (modalFormContent) modalFormContent.innerHTML = '';
            }

            if (submitBtn) {
                submitBtn.onclick = function(e) {
                    e.preventDefault();
                    
                    var username = usernameInput ? usernameInput.value.trim() : '';
                    var password = passwordInput ? passwordInput.value.trim() : '';
                    var confirmPassword = confirmPasswordInput ? confirmPasswordInput.value.trim() : '';
                    
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

                    cleanup();
                    resolve({ username: username, password: password });
                };
                // Focus the username input for better UX
                setTimeout(function() { 
                    if (usernameInput) usernameInput.focus(); 
                }, 100);
            }
            
            if (cancelBtn) {
                cancelBtn.onclick = function() {
                    cleanup();
                    resolve(null);
                };
            }
            
            // Allow ESC key to cancel
            var escHandler = function(e) {
                if (e.key === 'Escape') {
                    document.removeEventListener('keydown', escHandler);
                    cleanup();
                    resolve(null);
                }
            };
            document.addEventListener('keydown', escHandler);
        });
    }

    // Close modal when clicking outside of it
    if (modalOverlay) {
        modalOverlay.addEventListener('click', function(e) {
            // Use e.target for better cross-browser compatibility (Firefox)
            if (e.target === modalOverlay) {
                var cancelBtn = document.getElementById('modal-cancel-btn');
                if (cancelBtn) {
                    cancelBtn.click();
                } else {
                    var okBtn = modalActionsElem.querySelector('.submit-btn');
                    if (okBtn) okBtn.click();
                }
            }
        });
    }

    // Make functions globally accessible
    window.showAlert = showAlert;
    window.showConfirm = showConfirm;
    window.showRegistrationModal = showRegistrationModal;
})();