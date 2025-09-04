// Global UI functions for browser compatibility
(function() {
    'use strict';
    
    var dom = {};
    var loadingTimeout;
    var isLoadingBlocked = false; // Flag to prevent re-entrant calls

    function getArabicDayName(date) {
        var dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        return dayNames[date.getDay()];
    }

    function getAppToday() {
        const now = new Date();
        const appNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + (4 * 3600000)); // GMT+4
        appNow.setUTCHours(0, 0, 0, 0);
        return appNow;
    }

    /**
     * Queries and caches essential DOM elements from the main page.
     * @returns {object} An object containing the DOM elements.
     */
    function getDOMElements() {
        if (Object.keys(dom).length === 0) {
            dom.loadingOverlay = document.getElementById('loading-overlay');
            dom.formSection = document.getElementById('form-section');
            dom.playlistForm = document.getElementById('playlist-form');
            dom.playlistSection = document.getElementById('playlist-section');
            dom.showFormBtn = document.getElementById('show-form-btn');
            dom.cancelBtn = document.getElementById('cancel-btn');
            dom.songsContainer = document.getElementById('songs-container');
            dom.addSongBtn = document.getElementById('add-song-btn');
            dom.formTitle = document.getElementById('form-title');
            dom.saveBtn = document.getElementById('save-btn');
            dom.dayNameDisplay = document.getElementById('dayName');
            dom.dateAvailabilityMessage = document.getElementById('date-availability-message');
            // Form inputs
            dom.playlistIdInput = document.getElementById('playlistId');
            dom.eventDateInput = document.getElementById('eventDate');
            dom.eventLocationInput = document.getElementById('eventLocation');
            dom.phoneNumberInput = document.getElementById('phoneNumber');
            dom.brideZaffaInput = document.getElementById('brideZaffa');
            dom.groomZaffaInput = document.getElementById('groomZaffa');
            dom.notesInput = document.getElementById('notes');
        }
        return dom;
    }

    /**
     * Shows or hides the loading overlay.
     * When showing, it automatically hides after a set duration.
     * @param {boolean} show - `true` to show, `false` to hide immediately.
     */
    function showLoading(show) {
        if (isLoadingBlocked) return; // Prevent re-entrant calls, especially for reload loops

        if (window.refreshPageOnUpdate) {
            if (show) {
                isLoadingBlocked = true; // Set flag to block further calls
                window.location.reload();
            }
            return;
        }
        
        /* @tweakable The maximum time in milliseconds the 'Loading...' screen will be visible. */
        const loadingScreenMaxDuration = 1000;

        var loadingOverlay = getDOMElements().loadingOverlay;
        if (loadingOverlay) {
            clearTimeout(loadingTimeout); // Clear any existing timeout

            if (show) {
                loadingOverlay.classList.remove('hidden');
                // Set a timeout to hide the overlay automatically
                loadingTimeout = setTimeout(function() {
                    loadingOverlay.classList.add('hidden');
                }, loadingScreenMaxDuration);
            } else {
                loadingOverlay.classList.add('hidden');
            }
        }
    }

    // Make functions globally accessible
    window.getDOMElements = getDOMElements;
    window.showLoading = showLoading;
    window.getArabicDayName = getArabicDayName;
    window.getAppToday = getAppToday;
    
    /* @tweakable The confirmation message shown when deleting a song. */
    const songDeleteConfirmationMessage = 'هل أنت متأكد من حذف هذه الأغنية؟';
    // Make the variable globally accessible for form.js
    window.songDeleteConfirmationMessage = songDeleteConfirmationMessage;
})();