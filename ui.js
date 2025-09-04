// Global UI functions for browser compatibility
(function() {
    'use strict';
    
    // A cache for DOM elements to avoid repeated lookups
    var dom = {};

    /**
     * Gets the Arabic day name for a given date
     * @param {Date} date - The date object
     * @returns {string} The Arabic day name
     */
    function getArabicDayName(date) {
        var dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        return dayNames[date.getDay()];
    }

    /**
     * Gets a Date object representing the start of "today" in the application's configured timezone.
     * This ensures date comparisons are consistent for all users.
     * @returns {Date} A date object for the start of the current day in the app's timezone.
     */
    function getAppToday() {
        const now = new Date();
        // Create a UTC date based on the current time, then apply the app's timezone offset.
        // This correctly calculates the current date in the target timezone.
        const appNow = new Date(now.valueOf() + (window.APP_TIMEZONE_OFFSET_HOURS * 60 - (-now.getTimezoneOffset())) * 60000);
        appNow.setUTCHours(0, 0, 0, 0); // Set to the beginning of the day in UTC, which reflects the app's timezone date
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
     * @param {boolean} show - `true` to show, `false` to hide.
     */
    function showLoading(show) {
        var loadingOverlay = getDOMElements().loadingOverlay;
        if (loadingOverlay) {
            if (show) {
                loadingOverlay.classList.remove('hidden');
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