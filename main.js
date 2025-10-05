// Main application logic
(function() {
    'use strict';
    
    // Register service worker for offline functionality
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
            navigator.serviceWorker.register('./sw.js')
                .then(function() {
                    console.log('ServiceWorker registration successful');
                })
                .catch(function() {
                    console.log('ServiceWorker registration failed');
                });
        });
    }

    document.addEventListener('DOMContentLoaded', function() {
        const maxEventYear = 9999;
        const phoneNumberLength = 8;
        const formMaxWidth = '500px';
        document.documentElement.style.setProperty('--form-max-width', formMaxWidth);

        const modalMaxWidth = "320px";
        const modalTitleFontSize = "1.4rem";
        const modalMessageFontSize = "1.1rem";
        const modalMessageFontWeight = "bold";

        const cardHeaderGap = '1.5rem';
        document.documentElement.style.setProperty('--card-header-gap', cardHeaderGap);

        // تحقق من تسجيل الدخول
        var currentUser = localStorage.getItem('currentUser');
        var isAdmin = localStorage.getItem('isAdmin') === 'true';
        if (!currentUser) {
            window.location.href = 'login.html';
            return;
        }

        // عرض اسم المستخدم
        function updateUserDisplay() {
            const userDisplay = document.getElementById('current-user-display');
            if (!userDisplay) return;

            let welcomeText = 'مرحباً، ' + currentUser;
            if (isAdmin) {
                const adminWelcomeTemplate = ' (مدير) | عدد المناسبات المحفوظة بالموقع: ({count})';
                const playlistCount = window.getAllPlaylists ? window.getAllPlaylists().length : 0;
                welcomeText += adminWelcomeTemplate.replace('{count}', playlistCount);
            }
            userDisplay.textContent = welcomeText;
        }

        updateUserDisplay();

        // واجهة المدير
        if (isAdmin) {
            const showFormBtn = document.getElementById('show-form-btn');
            const showArchiveBtn = document.getElementById('show-archive-btn');
            const headerSubtitle = document.getElementById('header-subtitle');

            if (showFormBtn) showFormBtn.classList.add('hidden');
            if (showArchiveBtn) showArchiveBtn.classList.add('hidden');
            if (headerSubtitle) headerSubtitle.textContent = 'إدارة جميع الطلبات';
        }

        // تسجيل الخروج
        var logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            const logoutFontSize = '1.1rem';
            const logoutFontWeight = 'bold';

            logoutBtn.style.fontSize = logoutFontSize;
            logoutBtn.style.fontWeight = logoutFontWeight;
            
            logoutBtn.addEventListener('click', function() {
                window.showConfirm('هل أنت متأكد من تسجيل الخروج؟')
                    .then(function(confirmed) {
                        if (confirmed) {
                            localStorage.removeItem('currentUser');
                            localStorage.removeItem('currentUserPassword');
                            localStorage.removeItem('isAdmin');
                            Object.keys(localStorage).forEach(key => {
                                if (key.startsWith('cachedPlaylists_')) {
                                    localStorage.removeItem(key);
                                }
                            });
                            window.location.href = 'login.html';
                        }
                    });
            });
        }

        // تحقق من رابط Google Apps Script
        if (!window.GAS_URL_ENDPOINT || window.GAS_URL_ENDPOINT === 'PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE' || window.GAS_URL_ENDPOINT.indexOf('https://script.google.com') !== 0) {
            window.showAlert('الرجاء اتباع التعليمات في ملف config.js وإضافة رابط Google Apps Script الصحيح.');
            window.showLoading(false);
            return;
        }

        var dom = window.getDOMElements();

        // تحقق من التاريخ
        function checkDateAvailability() {
            var selectedDateValue = dom.eventDateInput.value;
            if (!selectedDateValue) {
                window.updateDateAvailabilityMessage(null);
                return;
            }

            var selectedDate = new Date(selectedDateValue);
            if (isNaN(selectedDate.getTime())) return;
            
            var today = new Date();
            today.setHours(0, 0, 0, 0); 

            var selectedDateUTC = new Date(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), selectedDate.getUTCDate());

            if (selectedDateUTC < today) {
                window.updateDateAvailabilityMessage('past');
                return;
            }
            
            var allSheetData = window.getAllSheetData() || [];
            var editingId = dom.playlistIdInput.value;
            var isBooked = false;
            
            selectedDate.setMinutes(selectedDate.getMinutes() + selectedDate.getTimezoneOffset());
            var selectedDateString = selectedDate.toISOString().split('T')[0];

            for (var i = 0; i < allSheetData.length; i++) {
                var playlist = allSheetData[i];
                if (!playlist.date) continue;
                if (editingId && playlist.id.toString() === editingId.toString()) continue;
                
                var playlistDate = new Date(playlist.date);
                if (isNaN(playlistDate.getTime())) continue;
                
                playlistDate.setMinutes(playlistDate.getMinutes() + playlistDate.getTimezoneOffset());
                var playlistDateString = playlistDate.toISOString().split('T')[0];
                
                if (playlistDateString === selectedDateString) {
                    isBooked = true;
                    break;
                }
            }
            
            window.updateDateAvailabilityMessage(!isBooked);
        }

        // ✅ رسالة أول قاعدة بيانات
        function updateFirstPlaylistMessageVisibility() {
            /* @tweakable If true, the welcome message with the WhatsApp link will be shown to admin users. */
            const showWelcomeMessageForAdmin = false;
            const isAdmin = localStorage.getItem('isAdmin') === 'true';
        
            const firstPlaylistMessage = document.getElementById('first-playlist-message');
            const firstPlaylistMessageText = document.getElementById('first-playlist-message-text');
            if (firstPlaylistMessage && firstPlaylistMessageText) {
                // Hide message for admin unless tweakable is changed
                if (isAdmin && !showWelcomeMessageForAdmin) {
                    firstPlaylistMessage.classList.add('hidden');
                    return;
                }
        
                const creationTime = localStorage.getItem('firstPlaylistCreationTime');
                const whatsappLink = localStorage.getItem('firstPlaylistWhatsappLink');
                const messageShown = localStorage.getItem('firstPlaylistMessageShown');
                const firstPlaylistCreated = localStorage.getItem('firstPlaylistCreated');
                
                // Check if a playlist has actually been created, not just a new account.
                // Also ensures at least one playlist exists for the message to show.
                if (!creationTime || !whatsappLink || messageShown === 'true' || firstPlaylistCreated !== 'true' || window.getAllPlaylists().length === 0) {
                    firstPlaylistMessage.classList.add('hidden');
                    return;
                }
        
                const currentTime = new Date().getTime();
                const timeElapsed = currentTime - parseInt(creationTime, 10);
                /* @tweakable The duration in minutes for which the first playlist message is shown. After this time, it will disappear permanently. */
                const durationMinutes = firstPlaylistMessageDurationMinutes;
                const durationMs = durationMinutes * 60 * 1000;
        
                const shouldBeVisible = timeElapsed < durationMs;
                firstPlaylistMessage.classList.toggle('hidden', !shouldBeVisible);
        
                if (shouldBeVisible) {
                    /* @tweakable The welcome message that appears after creating the first playlist. */
                    const welcomeMessage = 'تهانينا .. لقد تم إنشاء قائمة المناسبة بنجاح ، سيتم تلبية طلباتكم ، يرجى التواصل معنا';
                    firstPlaylistMessageText.innerHTML = `${welcomeMessage} <a href="${whatsappLink}" target="_blank">واتساب</a>`;
                } else {
                    // After the duration expires, mark the message as shown so it doesn't appear again.
                    localStorage.setItem('firstPlaylistMessageShown', 'true');
                    firstPlaylistMessage.classList.add('hidden');
                }
            }
        }

        // ضبط الهاتف
        if (dom.phoneNumberInput) {
            dom.phoneNumberInput.maxLength = phoneNumberLength;
            dom.phoneNumberInput.pattern = `[0-9]{${phoneNumberLength}}`;
            dom.phoneNumberInput.title = `الرجاء إدخال ${phoneNumberLength} أرقام فقط`;
            dom.phoneNumberInput.addEventListener('input', function(e) {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
            });
        }

        // ضبط التاريخ
        if (dom.eventDateInput) {
            dom.eventDateInput.max = `${maxEventYear}-12-31`;
            dom.eventDateInput.addEventListener('change', checkDateAvailability);
            dom.eventDateInput.addEventListener('change', function() {
                window.updateDayNameDisplay(window.getDOMElements().eventDateInput, window.getDOMElements().dayNameDisplay);
            });

            const minDateOffset = 0;
            const today = new Date();
            today.setDate(today.getDate() + minDateOffset);
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            dom.eventDateInput.min = `${yyyy}-${mm}-${dd}`;
        }

        // أحداث الأزرار
        if (dom.showFormBtn) dom.showFormBtn.addEventListener('click', function() { window.showForm(true); });
        if (dom.cancelBtn) dom.cancelBtn.addEventListener('click', window.resetForm);
        if (dom.addSongBtn) dom.addSongBtn.addEventListener('click', function() { window.requestAddSongField(); });
        if (dom.playlistForm) dom.playlistForm.addEventListener('submit', window.handleFormSubmit);
        if (dom.playlistSection) dom.playlistSection.addEventListener('click', window.handlePlaylistAction);

        window.addEventListener('datasync', updateFirstPlaylistMessageVisibility);
        if (isAdmin) window.addEventListener('datasync', updateUserDisplay);

        // تحميل أولي
        window.initializePage();
        window.resetForm(); 
        window.showForm(false); 
        window.startRealTimeSync();
        
        document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
                window.stopRealTimeSync();
            } else {
                window.startRealTimeSync();
            }
        });
        
        window.addEventListener('beforeunload', function() {
            window.stopRealTimeSync();
        });
        
        window.addEventListener('focus', function() {
            window.syncDataFromSheet();
        });
    });
})();
