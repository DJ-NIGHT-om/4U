// Real-time sync functionality
(function() {
    'use strict';
    
    /* @tweakable The delay in milliseconds between each background data sync. 12000ms = 12 seconds. */
    const syncFrequency = 11000;
    var syncInterval;
    var allPlaylists = [];
    var allSheetData = []; // To store all data from the sheet for date checking
    var lastSyncTime = 0;
    /* @tweakable If true, the background sync will be paused while an add/edit/delete operation is in progress to prevent race conditions. */
    let isSyncPaused = false;
    let lastOptimisticUpdate = {
        id: null,
        time: 0
    };

    /**
     * Processes raw data from the sheet, parsing songs and cleaning up notes.
     * @param {Array} data - The raw data array from Google Sheets.
     * @returns {Array} The processed data.
     */
    function processSheetData(data) {
        return data.map(playlist => {
            if (playlist.songs && typeof playlist.songs === 'string') {
                try {
                    playlist.songs = JSON.parse(playlist.songs);
                } catch (e) {
                    playlist.songs = []; // Default to empty array on parse error
                }
            }
            if (playlist.notes && typeof playlist.notes === 'string' && playlist.notes.startsWith("'")) {
                playlist.notes = playlist.notes.substring(1);
            }
            return playlist;
        });
    }

    /**
     * Filters playlists for the current user and handles archiving of past events.
     * @param {Array} userPlaylists - The list of playlists for the current user.
     * @returns {{currentPlaylists: Array, playlistsToArchive: Array}}
     */
    function filterAndArchivePlaylists(userPlaylists) {
        const appToday = window.getAppToday();
        const localArchive = JSON.parse(localStorage.getItem('archivedPlaylists')) || [];
        const localArchiveIds = new Set(localArchive.map(p => p.id.toString()));

        let currentPlaylists = [];
        let playlistsToArchive = [];

        userPlaylists.forEach(playlist => {
            if (!playlist.date || playlist.date.trim() === '') return;
            
            const eventDate = new Date(playlist.date);
            const eventDateUTC = new Date(eventDate.getUTCFullYear(), eventDate.getUTCMonth(), eventDate.getUTCDate());

            if (!isNaN(eventDateUTC.getTime()) && eventDateUTC < appToday) {
                if (!localArchiveIds.has(playlist.id.toString())) {
                    playlistsToArchive.push(playlist);
                }
            } else {
                currentPlaylists.push(playlist);
            }
        });

        // Update local archive if there are new items to archive
        if (playlistsToArchive.length > 0) {
            const updatedArchive = localArchive.concat(playlistsToArchive);
            localStorage.setItem('archivedPlaylists', JSON.stringify(updatedArchive));
            // Trigger archive page update if it's open
            if (window.location.pathname.includes('user.html')) {
                 window.dispatchEvent(new CustomEvent('archiveUpdate'));
            }
        }
        
        // Clean up archive: remove items that no longer exist in the sheet
        const sheetIds = new Set(userPlaylists.map(p => p.id.toString()));
        const cleanedArchive = localArchive.filter(p => sheetIds.has(p.id.toString()));
        if (cleanedArchive.length !== localArchive.length) {
            localStorage.setItem('archivedPlaylists', JSON.stringify(cleanedArchive));
        }

        return { currentPlaylists };
    }

    /**
     * Updates the main UI with the current list of playlists.
     * @param {Array} currentPlaylists - The playlists to display.
     * @param {string} currentUser - The username of the current user.
     * @param {boolean} isAdmin - Whether the current user is an admin.
     */
    function updateMainUI(currentPlaylists, currentUser, isAdmin) {
        allPlaylists = currentPlaylists.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Cache the latest active playlists for faster initial load
        const cacheKey = 'cachedPlaylists_' + (isAdmin ? 'admin' : currentUser);
        localStorage.setItem(cacheKey, JSON.stringify(allPlaylists));
        
        if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
            const dom = window.getDOMElements();
            if (dom.playlistSection) {
                window.renderPlaylists(dom.playlistSection, allPlaylists);
            }
            window.dispatchEvent(new CustomEvent('datasync'));
        }
    }


    /**
     * Syncs data from Google Sheets and updates both main page and archive (user-specific)
     */
    function syncDataFromSheet() {
        if (isSyncPaused) {
            console.log("Sync is paused due to an ongoing user action.");
            return Promise.resolve();
        }

        const currentUser = localStorage.getItem('currentUser');
        const isAdmin = localStorage.getItem('isAdmin') === 'true';
        if (!currentUser) return Promise.resolve();

        // Prevent excessive sync calls
        if (Date.now() - lastSyncTime < 1000) {
            return Promise.resolve();
        }
        lastSyncTime = Date.now();

        return window.fetchPlaylistsFromSheet()
            .then(function(data) {
                const processedData = processSheetData(data);
                allSheetData = processedData; // Store all fetched data

                // Filter data based on user role
                let userPlaylists = isAdmin
                    ? processedData.filter(p => p.username) // Admin sees all playlists that have a user
                    : processedData.filter(p => p.username === currentUser);

                // --- Handle Optimistic Update Grace Period ---
                if (lastOptimisticUpdate.id && (Date.now() - lastOptimisticUpdate.time < window.optimisticUpdateGracePeriod)) {
                    const localUpdatedPlaylist = allPlaylists.find(p => p.id.toString() === lastOptimisticUpdate.id.toString());
                    if (localUpdatedPlaylist) {
                        const serverIndex = userPlaylists.findIndex(p => p.id.toString() === lastOptimisticUpdate.id.toString());
                        if (serverIndex > -1) {
                            userPlaylists[serverIndex] = localUpdatedPlaylist;
                        }
                    }
                } else {
                    lastOptimisticUpdate.id = null;
                }

                let currentPlaylists;
                if (isAdmin) {
                    const appToday = window.getAppToday();
                    currentPlaylists = userPlaylists.filter(playlist => {
                        if (!playlist.date || playlist.date.trim() === '') return false;
                        const eventDate = new Date(playlist.date);
                        const eventDateUTC = new Date(eventDate.getUTCFullYear(), eventDate.getUTCMonth(), eventDate.getUTCDate());
                        return !isNaN(eventDateUTC.getTime()) && eventDateUTC >= appToday;
                    });
                } else {
                    const result = filterAndArchivePlaylists(userPlaylists);
                    currentPlaylists = result.currentPlaylists;
                }

                updateMainUI(currentPlaylists, currentUser, isAdmin);

                console.log('Sync completed - Role:', isAdmin ? 'Admin' : 'User', 'Current playlists:', currentPlaylists.length);
            })
            .catch(function(error) {
                console.error('Error syncing data:', error);
            })
            .finally(function() {
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
     * Pauses or resumes the background sync.
     * @param {boolean} pause - True to pause, false to resume.
     * @param {number} [resumeAfterMs=0] - If resuming, this is the delay before it restarts.
     */
    function setSyncPaused(pause, resumeAfterMs = 0) {
        isSyncPaused = pause;
        if (!pause) {
            console.log(`Resuming sync in ${resumeAfterMs}ms.`);
            // When resuming, restart the sync interval after a short delay.
            stopRealTimeSync();
            setTimeout(startRealTimeSync, resumeAfterMs);
        } else {
            console.log("Sync paused.");
            // When pausing, stop it immediately.
            stopRealTimeSync();
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

        let dataLoaded = false;
        
        // 1. Try to load pre-fetched data from sessionStorage for the fastest load
        if (window.usePrefetchedData) {
            try {
                const prefetchedData = sessionStorage.getItem('prefetched_playlists');
                if (prefetchedData) {
                    allSheetData = JSON.parse(prefetchedData);
                    // Clear it so it's not used again on a page refresh
                    sessionStorage.removeItem('prefetched_playlists');
                    // Process and render this data immediately
                    processAndRenderData(allSheetData);
                    console.log("Initialized with prefetched data.");
                    dataLoaded = true;
                }
            } catch (e) {
                console.error("Error loading prefetched playlists:", e);
            }
        }


        // 2. If no pre-fetched data, load from local cache for a fast UI response
        if (!dataLoaded) {
            try {
                var cacheKey = 'cachedPlaylists_' + (isAdmin ? 'admin' : currentUser);
                var cachedPlaylists = JSON.parse(localStorage.getItem(cacheKey)) || [];
                if (cachedPlaylists.length > 0) {
                    allPlaylists = cachedPlaylists;
                    var dom = window.getDOMElements();
                    window.renderPlaylists(dom.playlistSection, allPlaylists);
                    window.dispatchEvent(new CustomEvent('datasync'));
                    dataLoaded = true;
                }
            } catch (e) {
                console.error("Error loading cached playlists:", e);
            }
        }
        
        // 3. Show loading indicator only if no data could be displayed immediately
        if (!dataLoaded) {
            window.showLoading(true);
        }
        
        // 4. Start the sync process to fetch fresh data from the sheet in the background.
        // The sync function will handle rendering and hiding the loading indicator.
        syncDataFromSheet();
    }

    /**
     * Processes raw sheet data and renders it to the UI.
     * This is a helper for initializePage to handle prefetched data.
     * @param {Array} rawData - The raw data from the sheet.
     */
    function processAndRenderData(rawData) {
        // This logic is extracted from syncDataFromSheet to be reusable
        var currentUser = localStorage.getItem('currentUser');
        var isAdmin = localStorage.getItem('isAdmin') === 'true';

        const processedData = processSheetData(rawData);

        var userPlaylists = isAdmin
            ? processedData.filter(p => p.username)
            : processedData.filter(p => p.username === currentUser);

        var appToday = window.getAppToday();
        var currentPlaylists = [];

        userPlaylists.forEach(function(playlist) {
            if (!playlist.date || playlist.date.trim() === '') return;
            var eventDate = new Date(playlist.date);
            var eventDateUTC = new Date(eventDate.getUTCFullYear(), eventDate.getUTCMonth(), eventDate.getUTCDate());
            if (!isNaN(eventDateUTC.getTime()) && eventDateUTC >= appToday) {
                currentPlaylists.push(playlist);
            }
        });

        allPlaylists = currentPlaylists.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        var cacheKey = 'cachedPlaylists_' + (isAdmin ? 'admin' : currentUser);
        localStorage.setItem(cacheKey, JSON.stringify(allPlaylists));
        
        var dom = window.getDOMElements();
        if (dom.playlistSection) {
            window.renderPlaylists(dom.playlistSection, allPlaylists);
        }
        window.dispatchEvent(new CustomEvent('datasync'));
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
     * @param {object} [playlistToUpdate] - Optional. If provided, only this specific playlist card will be updated for efficiency.
     */
    function updateLocalPlaylists(newPlaylists, playlistToUpdate) {
        // Sort playlists by date before updating the global state and UI
        allPlaylists = newPlaylists.sort((a, b) => new Date(a.date) - new Date(b.date));

        // If an update happened, record it for the sync grace period logic
        if (playlistToUpdate) {
            lastOptimisticUpdate.id = playlistToUpdate.id;
            lastOptimisticUpdate.time = Date.now();
        }

        // Persist the changes to local storage immediately
        var currentUser = localStorage.getItem('currentUser');
        var isAdmin = localStorage.getItem('isAdmin') === 'true';
        if (currentUser) {
            var cacheKey = 'cachedPlaylists_' + (isAdmin ? 'admin' : currentUser);
            localStorage.setItem(cacheKey, JSON.stringify(allPlaylists));
        }

        if (window.location.pathname.indexOf('index.html') !== -1 || window.location.pathname === '/') {
            if (playlistToUpdate && typeof window.renderOrUpdatePlaylistCard === 'function') {
                // Efficiently update just one card
                window.renderOrUpdatePlaylistCard(playlistToUpdate);
            } else {
                // Fallback to re-rendering everything if needed
                var dom = window.getDOMElements();
                if (dom.playlistSection) {
                    window.renderPlaylists(dom.playlistSection, allPlaylists);
                }
            }
        }
    }

    // Make functions globally accessible
    window.syncDataFromSheet = syncDataFromSheet;
    window.startRealTimeSync = startRealTimeSync;
    window.stopRealTimeSync = stopRealTimeSync;
    window.initializePage = initializePage;
    window.getAllPlaylists = getAllPlaylists;
    window.getAllSheetData = getAllSheetData;
    window.updateLocalPlaylists = updateLocalPlaylists;
    window.setSyncPaused = setSyncPaused;
})();

// Make functions globally accessible
window.syncDataFromSheet = syncDataFromSheet;
window.startRealTimeSync = startRealTimeSync;
window.stopRealTimeSync = stopRealTimeSync;
window.initializePage = initializePage;
window.getAllPlaylists = getAllPlaylists;
window.getAllSheetData = getAllSheetData;
window.updateLocalPlaylists = updateLocalPlaylists;
window.setSyncPaused = setSyncPaused;