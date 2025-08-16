// Main application logic
(function() {
    'use strict';
    
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
        /* @tweakable The maximum year allowed for the event date. */
        const maxEventYear = 9999;
        
        /* @tweakable The required number of digits for the phone number. */
        const phoneNumberLength = 8;
        
        /* @tweakable The maximum width of the new/edit form. */
        const formMaxWidth = '500px';
        document.documentElement.style.setProperty('--form-max-width', formMaxWidth);

        /* @tweakable The maximum width of the alert/confirmation modal window. */
        const modalMaxWidth = "320px";
        /* @tweakable The font size for the alert/confirmation modal title. */
        const modalTitleFontSize = "1.4rem";
        /* @tweakable The font size for the alert/confirmation modal message text. */
        const modalMessageFontSize = "1.1rem";
        /* @tweakable The font weight for the alert/confirmation modal message text. */
        const modalMessageFontWeight = "bold";

        /* @tweakable The duration in minutes for which the first playlist message is shown after creation. */
        const firstPlaylistMessageDurationMinutes = 60;

        document.documentElement.style.setProperty('--modal-max-width', modalMaxWidth);
        document.documentElement.style.setProperty('--modal-title-font-size', modalTitleFontSize);
        document.documentElement.style.setProperty('--modal-message-font-size', modalMessageFontSize);
        document.documentElement.style.setProperty('--modal-message-font-weight', modalMessageFontWeight);

        /* @tweakable The gap between the location and date in the card header. */
        const cardHeaderGap = '1.5rem';
        document.documentElement.style.setProperty('--card-header-gap', cardHeaderGap);

        // Check if user is logged in
        var currentUser = localStorage.getItem('currentUser');
        var isAdmin = localStorage.getItem('isAdmin') === 'true';
        if (!currentUser) {
            window.location.href = 'login.html';
            return;
        }

        /**
         * Updates the user display with welcome message and playlist count for admin.
         */
        function updateUserDisplay() {
            const userDisplay = document.getElementById('current-user-display');
            if (!userDisplay) return;

            let welcomeText = 'مرحباً، ' + currentUser;
            if (isAdmin) {
                /* @tweakable Template for the admin welcome message, where {count} is the number of playlists. */
                const adminWelcomeTemplate = ' (مدير) | عدد قواعد البيانات: ({count})';
                const playlistCount = window.getAllPlaylists ? window.getAllPlaylists().length : 0;
                welcomeText += adminWelcomeTemplate.replace('{count}', playlistCount);
            }
            userDisplay.textContent = welcomeText;
        }

        // Initial display
        updateUserDisplay();

        // Admin-specific UI adjustments
        if (isAdmin) {
            const showFormBtn = document.getElementById('show-form-btn');
            const showArchiveBtn = document.getElementById('show-archive-btn');
            const headerSubtitle = document.getElementById('header-subtitle');

            if (showFormBtn) showFormBtn.classList.add('hidden');
            if (showArchiveBtn) showArchiveBtn.classList.add('hidden');
            if (headerSubtitle) headerSubtitle.textContent = 'إدارة جميع الطلبات';
        }

        // Logout functionality
        var logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            /* @tweakable Font size for the logout button text */
            const logoutFontSize = '1.1rem';
            /* @tweakable Font weight for the logout button text */
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
                            // No longer need to remove archivedPlaylists on logout
                            // localStorage.removeItem('archivedPlaylists');
                            // Clear all cached data on logout
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

        // Check if the GAS_URL_ENDPOINT is configured
        if (!window.GAS_URL_ENDPOINT || window.GAS_URL_ENDPOINT === 'PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE' || window.GAS_URL_ENDPOINT.indexOf('https://script.google.com') !== 0) {
            window.showAlert('الرجاء اتباع التعليمات في ملف config.js وإضافة رابط Google Apps Script الصحيح.');
            window.showLoading(false);
            return;
        }

        var dom = window.getDOMElements();

        /**
         * Checks if the selected date is in the past or already booked.
         */
        function checkDateAvailability() {
            var selectedDateValue = dom.eventDateInput.value;
            if (!selectedDateValue) {
                window.updateDateAvailabilityMessage(null);
                return;
            }

            var selectedDate = new Date(selectedDateValue);
            /* @tweakable If true, allows selecting invalid dates in the form. Set to false to prevent errors. */
            const allowInvalidDates = false;
            if (!allowInvalidDates && isNaN(selectedDate.getTime())) {
                // The date from the input is not a valid date.
                // We can't proceed with checks. Silently return, or show a message.
                // Returning silently is less intrusive if the user is in the middle of typing.
                return;
            }
            
            var today = new Date();
            today.setHours(0, 0, 0, 0); // Set to start of today for comparison

            // Create a date object that isn't affected by timezone for comparison
            var selectedDateUTC = new Date(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), selectedDate.getUTCDate());

            if (selectedDateUTC < today) {
                window.updateDateAvailabilityMessage('past');
                return;
            }
            
            var allSheetData = window.getAllSheetData() || [];
            var editingId = dom.playlistIdInput.value;
            var isBooked = false;
            
            // Adjust for timezone to compare dates correctly
            selectedDate.setMinutes(selectedDate.getMinutes() + selectedDate.getTimezoneOffset());
            var selectedDateString = selectedDate.toISOString().split('T')[0];

            for (var i = 0; i < allSheetData.length; i++) {
                var playlist = allSheetData[i];
                if (!playlist.date) continue;
                
                // Don't compare against itself when editing
                if (editingId && playlist.id.toString() === editingId.toString()) {
                    continue;
                }
                
                var playlistDate = new Date(playlist.date);
                if (isNaN(playlistDate.getTime())) continue; // Skip invalid dates from data source
                
                playlistDate.setMinutes(playlistDate.getMinutes() + playlistDate.getTimezoneOffset());
                var playlistDateString = playlistDate.toISOString().split('T')[0];
                
                if (playlistDateString === selectedDateString) {
                    isBooked = true;
                    break;
                }
            }
            
            window.updateDateAvailabilityMessage(!isBooked);
        }

        /**
         * Shows or hides the message that appears after the first playlist is created for a specific duration.
         */
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
                
                if (!creationTime || !whatsappLink) {
                    firstPlaylistMessage.classList.add('hidden');
                    return;
                }

                const currentTime = new Date().getTime();
                const timeElapsed = currentTime - parseInt(creationTime, 10);
                const durationMs = firstPlaylistMessageDurationMinutes * 60 * 1000;

                const shouldBeVisible = timeElapsed < durationMs;
                firstPlaylistMessage.classList.toggle('hidden', !shouldBeVisible);

                if (shouldBeVisible) {
                    /* @tweakable The confirmation text before the WhatsApp link for the first playlist. */
                    const confirmationText = 'تهانينا .. لقد تم إنشاء قائمة المناسبة بنجاح ، سيتم تلبية طلباتكم ، يرجى التواصل معنا ';
                    firstPlaylistMessageText.innerHTML = `${confirmationText} <a href="${whatsappLink}" target="_blank">واتساب</a>`;
                }
            }
        }

        if (dom.phoneNumberInput) {
            dom.phoneNumberInput.maxLength = phoneNumberLength;
            dom.phoneNumberInput.pattern = `[0-9]{${phoneNumberLength}}`;
            dom.phoneNumberInput.title = `الرجاء إدخال ${phoneNumberLength} أرقام فقط`;
            dom.phoneNumberInput.addEventListener('input', function(e) {
                // Remove any non-digit characters
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
            });
        }

        if (dom.eventDateInput) {
            dom.eventDateInput.max = `${maxEventYear}-12-31`;
            dom.eventDateInput.addEventListener('change', checkDateAvailability);
            dom.eventDateInput.addEventListener('change', function() {
                window.updateDayNameDisplay(window.getDOMElements().eventDateInput, window.getDOMElements().dayNameDisplay);
            });
            
            /* @tweakable The offset in days from today for the minimum selectable date. 0 makes today the earliest, -1 allows yesterday. */
            const minDateOffset = 0;
            const today = new Date();
            today.setDate(today.getDate() + minDateOffset);
            // Format date to YYYY-MM-DD for the min attribute
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            const minDateString = `${yyyy}-${mm}-${dd}`;
            
            dom.eventDateInput.min = minDateString;
        }

        // --- Event Listeners ---
        if (dom.showFormBtn) {
            dom.showFormBtn.addEventListener('click', function() {
                window.showForm(true);
            });
        }
        if (dom.cancelBtn) {
            dom.cancelBtn.addEventListener('click', window.resetForm);
        }
        if (dom.addSongBtn) {
            dom.addSongBtn.addEventListener('click', function() {
                window.requestAddSongField();
            });
        }
        if (dom.playlistForm) {
            dom.playlistForm.addEventListener('submit', window.handleFormSubmit);
        }
        if (dom.playlistSection) {
            dom.playlistSection.addEventListener('click', window.handlePlaylistAction);
        }

        // Add a listener to update the message visibility whenever data is synced
        window.addEventListener('datasync', updateFirstPlaylistMessageVisibility);
        // Add a listener to update the admin's playlist count display
        if (isAdmin) {
            window.addEventListener('datasync', updateUserDisplay);
        }

        // --- Initial Load ---
        window.initializePage();
        window.resetForm(); // Reset form initially to set it up correctly (e.g., add first song field)
        window.showForm(false); // Then hide it
        
        // Start real-time synchronization
        window.startRealTimeSync();
        
        // Enhanced visibility change handling
        document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
                window.stopRealTimeSync();
            } else {
                // Force sync when page becomes visible again
                window.startRealTimeSync();
            }
        });
        
        // Enhanced beforeunload handling
        window.addEventListener('beforeunload', function() {
            window.stopRealTimeSync();
        });
        
        // Force sync on window focus
        window.addEventListener('focus', function() {
            window.syncDataFromSheet();
        });
    });
})();