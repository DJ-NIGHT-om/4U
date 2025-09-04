// Real-time sync functionality
(function() {
    'use strict';
    
    /* @tweakable The delay in milliseconds between each background data sync. A lower value means faster updates but more server requests. (e.g., 2500 = 2.5 seconds) */
    const syncFrequency = 2500;
    var syncInterval;
    var allPlaylists = [];
    var allSheetData = []; // To store all data from the sheet for date checking
    var lastSyncTime = 0;

    /**
     * Syncs data from Google Sheets and updates both main page and archive (user-specific)
     */
    function syncDataFromSheet() {
        var currentUser = localStorage.getItem('currentUser');
        var isAdmin = localStorage.getItem('isAdmin') === 'true';
        if (!currentUser) return Promise.resolve();

        // Prevent excessive sync calls
        var now = Date.now();
        if (now - lastSyncTime < 1000) {
            return Promise.resolve();
        }
        lastSyncTime = now;

        return window.fetchPlaylistsFromSheet()
            .then(function(data) {
                allSheetData = data; // Store all fetched data

                // Filter data based on user role
                var userPlaylists = isAdmin
                    ? data.filter(p => p.username) // Admin sees all playlists that have a user
                    : data.filter(p => p.username === currentUser);

                var today = new Date();
                today.setHours(0, 0, 0, 0); // Set to start of today for comparison
                // Use the new timezone-aware "today" for archiving logic
                var appToday = window.getAppToday();

                var currentPlaylists = [];
                var playlistsToArchive = [];
                var localArchive = JSON.parse(localStorage.getItem('archivedPlaylists')) || [];
                var localArchiveIds = {};
                
                // Create a lookup for archived IDs
                for (var i = 0; i < localArchive.length; i++) {
                    localArchiveIds[localArchive[i].id.toString()] = true;
                }

                if (isAdmin) {
                    // Admin View: Show all non-archived playlists from all users.
                    // We don't perform archiving actions for the admin.
                    currentPlaylists = userPlaylists.filter(function(playlist) {
                        if (!playlist.date || playlist.date.trim() === '') return false;
                        var eventDate = new Date(playlist.date);
                        var eventDateUTC = new Date(eventDate.getUTCFullYear(), eventDate.getUTCMonth(), eventDate.getUTCDate());
                        return !isNaN(eventDateUTC.getTime()) && eventDateUTC >= appToday;
                    });

                } else {
                    // Regular User View: Handle archiving
                    userPlaylists.forEach(function(playlist) {
                        if (!playlist.date || playlist.date.trim() === '') return;
                        
                        var eventDate = new Date(playlist.date);
                        var eventDateUTC = new Date(eventDate.getUTCFullYear(), eventDate.getUTCMonth(), eventDate.getUTCDate());

                        if (!isNaN(eventDateUTC.getTime()) && eventDateUTC < appToday) {
                            if (!localArchiveIds[playlist.id.toString()]) {
                                playlistsToArchive.push(playlist);
                            }
                        } else {
                            currentPlaylists.push(playlist);
                        }
                    });

                    // Update local archive if there are new items to archive
                    if (playlistsToArchive.length > 0) {
                        localArchive = localArchive.concat(playlistsToArchive);
                        localStorage.setItem('archivedPlaylists', JSON.stringify(localArchive));
                    }

                    // Trigger archive page update if it's open
                    if (window.location.pathname.indexOf('user.html') !== -1) {
                         window.dispatchEvent(new CustomEvent('archiveUpdate'));
                    }
                }

                // Check for deleted items in Google Sheet and remove from archive
                var sheetIds = {};
                for (var i = 0; i < userPlaylists.length; i++) {
                    sheetIds[userPlaylists[i].id.toString()] = true;
                }
                localArchive = localArchive.filter(function(p) {
                    return sheetIds[p.id.toString()];
                });

                // Update main page display
                var previousCount = allPlaylists.length;
                allPlaylists = currentPlaylists.sort((a, b) => new Date(a.date) - new Date(b.date));
                
                // Cache the latest active playlists for faster initial load
                var cacheKey = 'cachedPlaylists_' + (isAdmin ? 'admin' : currentUser);
                localStorage.setItem(cacheKey, JSON.stringify(allPlaylists));
                
                // Only update UI if we're on the main page
                if (window.location.pathname.indexOf('index.html') !== -1 || window.location.pathname === '/') {
                    var dom = window.getDOMElements();
                    if (dom.playlistSection) {
                        window.renderPlaylists(dom.playlistSection, allPlaylists);
                    }
                    window.dispatchEvent(new CustomEvent('datasync'));
                }

                // Log sync activity for debugging
                console.log('Sync completed - Role:', isAdmin ? 'Admin' : 'User', 'Current playlists:', allPlaylists.length);
            })
            .catch(function(error) {
                console.error('Error syncing data:', error);
                // Don't show error to user for background sync
            })
            .finally(function() {
                // Ensure loading indicator is hidden after sync
                window.showLoading(false);
            });
    }

    /**
     * Starts the real-time sync interval
     */
    function startRealTimeSync() {
        // Clear any existing interval
        if (syncInterval) {
            clearInterval(syncInterval);
        }
        
        // Initial sync
        syncDataFromSheet();
        
        // Sync every N seconds for better responsiveness
        syncInterval = setInterval(syncDataFromSheet, syncFrequency);
    }

    /**
     * Stops the real-time sync interval
     */
    function stopRealTimeSync() {
        if (syncInterval) {
            clearInterval(syncInterval);
            syncInterval = null;
        }
    }

    /**
     * Fetches playlists, separates current from archived, displays current ones,
     * and archives the old ones (user-specific).
     */
    function initializePage() {
        var currentUser = localStorage.getItem('currentUser');
        var isAdmin = localStorage.getItem('isAdmin') === 'true';
        if (!currentUser) return;

        // 1. Load from local cache and display immediately for a fast UI response
        try {
            var cacheKey = 'cachedPlaylists_' + (isAdmin ? 'admin' : currentUser);
            var cachedPlaylists = JSON.parse(localStorage.getItem(cacheKey)) || [];
            if (cachedPlaylists.length > 0) {
                allPlaylists = cachedPlaylists;
                var dom = window.getDOMElements();
                window.renderPlaylists(dom.playlistSection, allPlaylists);
                window.dispatchEvent(new CustomEvent('datasync'));
            } else {
                // Only show loading indicator if there's no cached data to display
                window.showLoading(true);
            }
        } catch (e) {
            console.error("Error loading cached playlists:", e);
            window.showLoading(true); // Show loading if cache fails
        }
        
        // 2. Start the sync process to fetch fresh data from the sheet in the background.
        // The sync function will handle rendering and hiding the loading indicator.
        syncDataFromSheet();
    }

    /**
     * Stores playlists in local storage and sends a request to delete them from the sheet.
     * @param {Array} playlistsToArchive - An array of playlist objects to archive.
     */
    function archivePlaylists(playlistsToArchive) {
        try {
            // Get current local archive
            var localArchive = JSON.parse(localStorage.getItem('archivedPlaylists')) || [];
            
            // Remove any existing entries with the same IDs to prevent duplicates
            var idsToArchive = [];
            for (var i = 0; i < playlistsToArchive.length; i++) {
                idsToArchive.push(playlistsToArchive[i].id.toString());
            }
            
            localArchive = localArchive.filter(function(p) {
                return idsToArchive.indexOf(p.id.toString()) === -1;
            });
            
            // Add new playlists to local archive
            var updatedArchive = localArchive.concat(playlistsToArchive);
            localStorage.setItem('archivedPlaylists', JSON.stringify(updatedArchive));
            
            // Send request to delete from sheet
            var idsToDelete = [];
            for (var i = 0; i < playlistsToArchive.length; i++) {
                idsToDelete.push(playlistsToArchive[i].id);
            }
            
            return window.postDataToSheet({ action: 'archive', ids: idsToDelete });
        } catch (error) {
            console.error('Error archiving playlists in Google Sheet:', error);
            window.showAlert('حدث خطأ أثناء أرشفة بعض القوائم. سيتم إعادة المحاولة في التحميل القادم.');
        }
    }

    function getAllPlaylists() {
        return allPlaylists;
    }

    function getAllSheetData() {
        return allSheetData;
    }
    
    /**
     * Updates the local playlist array and re-renders the UI.
     * @param {Array} newPlaylists - The new array of playlists.
     */
    function updateLocalPlaylists(newPlaylists) {
        // Sort playlists by date before updating the global state and UI
        allPlaylists = newPlaylists.sort((a, b) => new Date(a.date) - new Date(b.date));

        if (window.location.pathname.indexOf('index.html') !== -1 || window.location.pathname === '/') {
            var dom = window.getDOMElements();
            if (dom.playlistSection) {
                window.renderPlaylists(dom.playlistSection, allPlaylists);
            }
        }
    }

    // Make functions globally accessible
    window.syncDataFromSheet = syncDataFromSheet;
    window.startRealTimeSync = startRealTimeSync;
    window.stopRealTimeSync = stopRealTimeSync;
    window.initializePage = initializePage;
    window.archivePlaylists = archivePlaylists;
    window.getAllPlaylists = getAllPlaylists;
    window.getAllSheetData = getAllSheetData;
    window.updateLocalPlaylists = updateLocalPlaylists;
})();