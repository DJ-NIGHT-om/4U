// Playlist-specific operations
(function() {
    'use strict';
    
    /**
     * Optimistically adds a new playlist to the UI before sending it to the server.
     * @param {object} playlistData - The data for the new playlist.
     * @returns {string} The generated temporary ID for the new playlist.
     */
    function optimisticallyAddPlaylist(playlistData) {
        const playlists = window.getAllPlaylists();
        const tempId = new Date().getTime().toString();
        
        const newPlaylist = { ...playlistData, id: tempId };
        
        // Add the new playlist to the local array
        playlists.push(newPlaylist);
        
        // Sort the array by date to maintain order
        playlists.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Update the UI immediately
        window.updateLocalPlaylists(playlists, newPlaylist);
        
        return tempId;
    }

    /**
     * Adds a new playlist, handling optimistic updates and API calls.
     * @param {object} playlistData - The data for the new playlist from the form.
     * @param {boolean} isFirstPlaylist - Whether this is the user's first playlist.
     */
    function addPlaylist(playlistData, isFirstPlaylist) {
        const tempId = optimisticallyAddPlaylist(playlistData);
        window.resetForm();
        
        // Handle first playlist specific logic
        if (isFirstPlaylist) {
             /* @tweakable The WhatsApp number to send the first playlist details to. */
            const whatsappNumber = '96899383859';
            /* @tweakable The message template for the WhatsApp link. Use {date}, {location}, {brideZaffa}, {groomZaffa} as placeholders. */
            const whatsappMessageTemplate = "السلام عليكم، هذه تفاصيل مناسبتنا:\n📅 التاريخ: {date}\n📍 المكان: {location}\n🥁 زفة العروس: {brideZaffa}\n🥁 زفة المعرس: {groomZaffa}";
            
            localStorage.setItem('firstPlaylistCreationTime', new Date().getTime());
            localStorage.removeItem('firstPlaylistMessageShown'); // Reset shown flag

            const message = whatsappMessageTemplate
                .replace('{date}', playlistData.date)
                .replace('{location}', playlistData.location)
                .replace('{brideZaffa}', playlistData.brideZaffa)
                .replace('{groomZaffa}', playlistData.groomZaffa);
            
            const whatsappUrl = `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${encodeURIComponent(message)}`;
            localStorage.setItem('firstPlaylistWhatsappLink', whatsappUrl);
        
           if (window.triggerWelcomeConfetti) window.triggerWelcomeConfetti();
           window.dispatchEvent(new CustomEvent('datasync')); // Ensure message appears instantly
        }

        /* @tweakable Prepending notes with a special character (like a quote) forces Google Sheets to treat it as plain text, preventing unwanted auto-formatting of dates or numbers. */
        const forceNotesAsStringInSheet = true;
        let notesValue = playlistData.notes;
        if (forceNotesAsStringInSheet && notesValue) {
            notesValue = "'" + notesValue;
        }

        const apiPayload = {
            ...playlistData,
            id: tempId,
            notes: notesValue,
            action: 'add',
            forceNotesAsString: false
        };

        window.postDataToSheet(apiPayload)
            .then(function(result) {
                if (result.status === 'success') {
                    console.log('Add successful.');
                    if (isFirstPlaylist) {
                        localStorage.setItem('firstPlaylistCreated', 'true');
                    }
                    // The background sync will handle the final state.
                } else {
                    throw new Error(result.message || 'Failed to add playlist.');
                }
            })
            .catch(function(error) {
                console.error('Error adding playlist, reverting UI:', error);
                window.showAlert('حدث خطأ أثناء إضافة القائمة. سيتم التراجع عن التغييرات.');
                // Revert UI by removing the optimistically added playlist
                const revertedPlaylists = window.getAllPlaylists().filter(p => p.id !== tempId);
                window.updateLocalPlaylists(revertedPlaylists);
            });
    }

    /**
     * Updates an existing playlist, handling optimistic updates and API calls.
     * @param {string} playlistId - The ID of the playlist to update.
     * @param {object} updatedData - The new data for the playlist from the form.
     * @param {object} originalPlaylist - The original playlist data before edits.
     */
    function updatePlaylist(playlistId, updatedData, originalPlaylist) {
        /* @tweakable The delay in milliseconds to wait before resuming background sync after a successful edit, preventing race conditions. */
        const resumeSyncDelay = 1000;

        const playlists = window.getAllPlaylists();
        const oldPlaylists = JSON.parse(JSON.stringify(playlists)); // Deep copy for revert

        // Pause sync to prevent race conditions
        window.setSyncPaused(true);

        // Optimistically update UI
        const newPlaylists = playlists.map(p => p.id.toString() === playlistId.toString() ? updatedData : p);
        window.updateLocalPlaylists(newPlaylists, updatedData);
        window.resetForm();

        /* @tweakable This is now controlled from index.html */
        let changes = {};
        if (window.sendOnlyChangedFields) {
            let originalSongs = Array.isArray(originalPlaylist.songs) ? originalPlaylist.songs : [];
            try {
                if (typeof originalPlaylist.songs === 'string') originalSongs = JSON.parse(originalPlaylist.songs);
            } catch (e) { /* default to empty array */ }

            if (updatedData.date !== originalPlaylist.date) changes.date = updatedData.date;
            if (updatedData.location !== originalPlaylist.location) changes.location = updatedData.location;
            if (updatedData.phoneNumber !== originalPlaylist.phoneNumber) changes.phoneNumber = updatedData.phoneNumber;
            if (updatedData.brideZaffa !== originalPlaylist.brideZaffa) changes.brideZaffa = updatedData.brideZaffa;
            if (updatedData.groomZaffa !== originalPlaylist.groomZaffa) changes.groomZaffa = updatedData.groomZaffa;
            if (updatedData.notes !== originalPlaylist.notes) changes.notes = updatedData.notes;
            if (JSON.stringify(updatedData.songs) !== JSON.stringify(originalSongs)) changes.songs = updatedData.songs;
        }

        if (window.sendOnlyChangedFields && Object.keys(changes).length === 0) {
            console.log("No changes detected, skipping API call.");
            return;
        }
        
        const apiPayload = {
            action: 'edit',
            id: playlistId,
            changes: changes,
            ...updatedData
        };

        window.postDataToSheet(apiPayload)
            .then(function(result) {
                if (result.status === 'success') {
                    console.log('Edit successful. Triggering immediate sync.');
                    // After a successful edit, sync immediately to get the canonical data
                    return window.syncDataFromSheet();
                } else {
                    throw new Error(result.message || 'Failed to edit playlist.');
                }
            })
            .catch(function(error) {
                console.error('Error updating playlist, reverting UI:', error);
                window.showAlert('حدث خطأ أثناء تعديل القائمة. سيتم التراجع عن التغييرات.');
                window.updateLocalPlaylists(oldPlaylists); // Revert UI
            })
            .finally(function() {
                // Resume sync after a short delay, regardless of outcome.
                window.setSyncPaused(false, resumeSyncDelay);
            });
    }

    /**
     * Deletes a playlist, handling optimistic updates and API calls.
     * @param {string} playlistId - The ID of the playlist to delete.
     * @param {HTMLElement} cardElement - The card element to animate/remove.
     */
    function deletePlaylist(playlistId, cardElement) {
        /* @tweakable Setting to false will cause the item to be removed from the list instantly, without animation. */
        const useDeleteAnimation = true;
        /* @tweakable The duration in milliseconds for the delete animation, if enabled. */
        const deleteAnimationDuration = 300;

        const performDelete = () => {
            const playlists = window.getAllPlaylists();
            const oldPlaylists = JSON.parse(JSON.stringify(playlists));
            const isAdmin = localStorage.getItem('isAdmin') === 'true';

            // Check if this is the last playlist before filtering
            if (window.removeWelcomeOnLastDelete && !isAdmin && playlists.length === 1) {
                // If the playlist being deleted is the last one, clear the welcome message flags.
                if (playlists[0].id.toString() === playlistId.toString()) {
                    localStorage.removeItem('firstPlaylistCreationTime');
                    localStorage.removeItem('firstPlaylistWhatsappLink');
                    localStorage.removeItem('firstPlaylistCreated');
                    localStorage.removeItem('firstPlaylistMessageShown');
                    window.dispatchEvent(new CustomEvent('datasync'));
                }
            }

            const updatedPlaylists = playlists.filter(p => p.id.toString() !== playlistId.toString());
            window.updateLocalPlaylists(updatedPlaylists);

            window.postDataToSheet({ action: 'delete', id: playlistId })
                .then(function(result) {
                    if (result.status === 'success') {
                        console.log('Delete successful.');
                    } else {
                        throw new Error(result.message || 'Failed to delete from server.');
                    }
                })
                .catch(function(error) {
                    console.error('Error deleting playlist, reverting UI:', error);
                    window.showAlert('حدث خطأ أثناء الحذف. سيتم استعادة القائمة.');
                    window.updateLocalPlaylists(oldPlaylists);
                });
        };

        if (useDeleteAnimation && cardElement) {
            cardElement.classList.add('deleting');
            setTimeout(performDelete, deleteAnimationDuration);
        } else {
            performDelete();
        }
    }

    // Make functions globally accessible
    window.addPlaylist = addPlaylist;
    window.updatePlaylist = updatePlaylist;
    window.deletePlaylist = deletePlaylist;
})();