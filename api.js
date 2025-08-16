// Global API functions for browser compatibility
(function() {
    'use strict';
    
    /**
     * Fetches all playlists from the Google Sheet.
     * @returns {Promise<Array>} A promise that resolves to an array of playlist objects.
     */
    function fetchPlaylistsFromSheet() {
        return fetch(window.GAS_URL_ENDPOINT, { method: 'GET' })
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('Network response was not ok: ' + response.statusText);
                }
                return response.json();
            });
    }

    /**
     * Sends data to the Google Sheet backend using a POST request.
     * This is used for adding, editing, deleting, and archiving playlists.
     * @param {object} data - The data payload to send.
     * @returns {Promise<object>} A promise that resolves to the JSON response from the server.
     */
    function postDataToSheet(data) {
        return fetch(window.GAS_URL_ENDPOINT, {
            method: 'POST',
            // The Apps Script expects a stringified payload with a specific content type
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        })
        .then(function(response) {
            if (!response.ok) {
                throw new Error('Network response was not ok: ' + response.statusText);
            }
            return response.json();
        });
    }

    // Make functions globally accessible
    window.fetchPlaylistsFromSheet = fetchPlaylistsFromSheet;
    window.postDataToSheet = postDataToSheet;
})();