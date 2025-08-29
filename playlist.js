// Playlist-specific operations
(function() {
    'use strict';
    
    /**
     * Handles the form submission for adding or editing a playlist.
     * @param {Event} e - The form submit event.
     */
    function handleFormSubmit(e) {
        e.preventDefault();
        var currentUser = localStorage.getItem('currentUser');
        var currentUserPassword = localStorage.getItem('currentUserPassword');
        var isAdmin = localStorage.getItem('isAdmin') === 'true';
        if (!currentUser) return;

        var dom = window.getDOMElements();
        
        // Validate date - must be today or future based on app timezone
        var selectedDate = new Date(dom.eventDateInput.value);
        // This creates a date at midnight UTC, which is what we want for comparison
        var selectedDateUTC = new Date(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), selectedDate.getUTCDate());
        var appToday = window.getAppToday();
        
        if (selectedDateUTC < appToday) {
            window.showAlert('لا يمكن اختيار تاريخ في الماضي. يرجى اختيار تاريخ اليوم أو تاريخ مستقبلي.');
            return;
        }

        var songInputs = dom.songsContainer.querySelectorAll('.song-input');
        var songs = [];
        for (var i = 0; i < songInputs.length; i++) {
            var songValue = songInputs[i].value.trim();
            if (songValue) {
                songs.push(songValue);
            }
        }
        
        var playlistId = dom.playlistIdInput.value;
        var isEdit = playlistId && playlistId.trim() !== '';

        // Check if this is the first playlist being added by this user
        const isFirstPlaylist = !isEdit && !isAdmin && window.getAllPlaylists().length === 0;

        var playlistData;
        var apiPayload;
        
        /* @tweakable Prepending notes with a special character (like a quote) forces Google Sheets to treat it as plain text, preventing unwanted auto-formatting of dates or numbers. */
        const forceNotesAsStringInSheet = true;
        let notesValue = dom.notesInput.value;
        if (forceNotesAsStringInSheet && notesValue) {
            notesValue = "'" + notesValue;
        }
        
        // --- Optimistic Update ---
        if (isEdit) {
            let originalPlaylist = window.getAllSheetData().find(p => p.id == playlistId);
            if (!originalPlaylist) {
                console.error("Original playlist not found for edit");
                window.showAlert("حدث خطأ: لم يتم العثور على القائمة الأصلية للتعديل.");
                return;
            }

            playlistData = {
                id: playlistId,
                date: dom.eventDateInput.value,
                location: dom.eventLocationInput.value,
                phoneNumber: dom.phoneNumberInput.value,
                brideZaffa: dom.brideZaffaInput.value,
                groomZaffa: dom.groomZaffaInput.value,
                songs: songs,
                notes: dom.notesInput.value, // Keep original notes for UI
                username: originalPlaylist.username,
                password: originalPlaylist.password
            };

            /* @tweakable This is now controlled from index.html */
            let changes = {};
            if (window.sendOnlyChangedFields) {
                // To reliably compare, we need to handle cases where songs might be a string or an array
                let originalSongs = [];
                try {
                    if (Array.isArray(originalPlaylist.songs)) {
                        originalSongs = originalPlaylist.songs;
                    } else if (typeof originalPlaylist.songs === 'string') {
                        originalSongs = JSON.parse(originalPlaylist.songs);
                    }
                } catch (e) { /* default to empty array */ }

                if (playlistData.date !== originalPlaylist.date) changes.date = playlistData.date;
                if (playlistData.location !== originalPlaylist.location) changes.location = playlistData.location;
                if (playlistData.phoneNumber !== originalPlaylist.phoneNumber) changes.phoneNumber = playlistData.phoneNumber;
                if (playlistData.brideZaffa !== originalPlaylist.brideZaffa) changes.brideZaffa = playlistData.brideZaffa;
                if (playlistData.groomZaffa !== originalPlaylist.groomZaffa) changes.groomZaffa = playlistData.groomZaffa;
                if (dom.notesInput.value !== originalPlaylist.notes) changes.notes = notesValue; // Send formatted notes
                if (JSON.stringify(playlistData.songs) !== JSON.stringify(originalSongs)) changes.songs = playlistData.songs;
            }

            apiPayload = {
                action: 'edit',
                id: playlistId,
                changes: changes,
                forceNotesAsString: false, // The logic is now handled on the client
                 // Also send full data for backend fallback
                ...playlistData,
                notes: notesValue // Ensure payload has formatted notes
            };
            
            // If no changes were made, don't send to server, just close the form.
            if (window.sendOnlyChangedFields && Object.keys(changes).length === 0) {
                 window.resetForm();
                 return;
            }

        } else {
             // Admin should not be able to create new playlists from this form
            if (isAdmin) {
                window.showAlert('لا يمكن للمدير إنشاء قوائم جديدة من هذه الواجهة.');
                return;
            }
            playlistData = {
                date: dom.eventDateInput.value,
                location: dom.eventLocationInput.value,
                phoneNumber: dom.phoneNumberInput.value,
                brideZaffa: dom.brideZaffaInput.value,
                groomZaffa: dom.groomZaffaInput.value,
                songs: songs,
                notes: dom.notesInput.value, // Keep original notes for UI
                username: currentUser,
                password: currentUserPassword || '' // Ensure password exists
            };
            apiPayload = { 
                ...playlistData, 
                action: 'add', 
                notes: notesValue, // Send formatted notes
                forceNotesAsString: false // The logic is now handled on the client
            };
        }
        
        var playlists = window.getAllPlaylists();
        var oldPlaylists = JSON.parse(JSON.stringify(playlists)); // Deep copy for revert
        var newOrUpdatedPlaylist;

        // --- Optimistic UI Update ---
        if (isEdit) {
            newOrUpdatedPlaylist = { ...playlistData };
            playlists = playlists.map(p => p.id.toString() === playlistId.toString() ? newOrUpdatedPlaylist : p);
        } else {
            playlistId = new Date().getTime().toString();
            playlistData.id = playlistId;
            apiPayload.id = playlistId;
            newOrUpdatedPlaylist = { ...playlistData };
            playlists.push(newOrUpdatedPlaylist);
        }
        
        // Immediately update the UI
        window.updateLocalPlaylists(playlists, newOrUpdatedPlaylist);
        window.resetForm();

        // Show confetti for the first playlist
      if ((isFirstPlaylist || isEdit) && playlistId && window.getAllPlaylists().length > 0) {
           localStorage.setItem('firstPlaylistCreationTime', new Date().getTime());
            /* @tweakable The WhatsApp number to send the first playlist details to. */
            const whatsappNumber = '96899383859';
            /* @tweakable The message template for the WhatsApp link. Use {date}, {location}, {brideZaffa}, {groomZaffa} as placeholders. */
            const whatsappMessageTemplate = "السلام عليكم، هذه تفاصيل مناسبتنا:\n📅 التاريخ: {date}\n📍 المكان: {location}\n🥁 زفة العروس: {brideZaffa}\n🥁 زفة المعرس: {groomZaffa}";
            
            const message = whatsappMessageTemplate
                .replace('{date}', playlistData.date)
                .replace('{location}', playlistData.location)
                .replace('{brideZaffa}', playlistData.brideZaffa)
                .replace('{groomZaffa}', playlistData.groomZaffa);
            
            const whatsappUrl = `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${encodeURIComponent(message)}`;
            localStorage.setItem('firstPlaylistWhatsappLink', whatsappUrl);

           if (window.triggerWelcomeConfetti) {
              window.triggerWelcomeConfetti();
           }
           // Manually dispatch event since sync isn't called immediately
           window.dispatchEvent(new CustomEvent('datasync'));
        }
        
        // --- End Optimistic Update ---

        window.postDataToSheet(apiPayload)
            .then(function(result) {
                if (result.status === 'success') {
                    // Success! The optimistic update is now confirmed by the server.
                    // The background sync will eventually align everything perfectly.
                    console.log('Save successful.');
                } else {
                    throw new Error(result.message || 'Failed to save data.');
                }
            })
            .catch(function(error) {
                console.error('Error saving playlist, reverting UI:', error);
                window.showAlert('حدث خطأ أثناء حفظ القائمة. سيتم التراجع عن التغييرات.');
                // Revert UI to the state before the optimistic update
                window.updateLocalPlaylists(oldPlaylists);
            });
    }
    
    /**
     * Handles clicks on the edit and delete buttons within a playlist card.
     * @param {Event} e - The click event.
     */
    function handlePlaylistAction(e) {
        var card = e.target.closest('.playlist-card');
        if (!card) return;

        var playlistId = card.getAttribute('data-id');
        var isAdmin = localStorage.getItem('isAdmin') === 'true';
        var isDeleteButton = e.target.closest('.delete-btn');
        var isEditButton = e.target.closest('.edit-btn');

        if (isDeleteButton) {
            /* @tweakable Setting to false will cause the item to be removed from the list instantly, without animation. */
            const useDeleteAnimation = false;
            /* @tweakable The duration in milliseconds for the delete animation, if enabled. */
            const deleteAnimationDuration = 300;

            window.showConfirm('هل أنت متأكد من حذف هذه القائمة؟')
                .then(function(confirmed) {
                    if (confirmed) {
                        var playlists = window.getAllPlaylists();
                        var oldPlaylists = JSON.parse(JSON.stringify(playlists)); // Deep copy for revert

                        // This function contains the logic to remove the item and sync with the server
                        const performDelete = () => {
                            // Check if this is the last playlist and remove the welcome message if so
                            if (window.removeWelcomeOnLastDelete && !isAdmin && playlists.length === 1) {
                                localStorage.removeItem('firstPlaylistCreationTime');
                                localStorage.removeItem('firstPlaylistWhatsappLink');
                                // Dispatch event to immediately hide the welcome message
                                window.dispatchEvent(new CustomEvent('datasync'));
                            }
                            
                            var updatedPlaylists = playlists.filter(p => p.id.toString() !== playlistId.toString());
                            window.updateLocalPlaylists(updatedPlaylists);

                            window.postDataToSheet({ action: 'delete', id: playlistId })
                                .then(function(result) {
                                    if (result && result.status === 'success') {
                                        console.log('Delete successful.');
                                    } else {
                                        throw new Error(result.message || 'Failed to delete playlist on server.');
                                    }
                                })
                                .catch(function(error) {
                                    console.error('Error deleting playlist, reverting UI:', error);
                                    window.showAlert('حدث خطأ أثناء حذف القائمة. سيتم استعادة القائمة.');
                                    window.updateLocalPlaylists(oldPlaylists); // Revert UI
                                });
                        };

                        if (useDeleteAnimation) {
                            // --- Animate then Optimistically Update ---
                            card.classList.add('deleting');
                            setTimeout(performDelete, deleteAnimationDuration);
                        } else {
                            // --- Optimistically Update Instantly ---
                            performDelete();
                        }
                    }
                });
        } else if (isEditButton) {
            // Use all sheet data to find the playlist, ensuring we can edit items
            // that might be incorrectly filtered out from the main view.
            var allSheetData = window.getAllSheetData();
            var playlist = null;
            for (var i = 0; i < allSheetData.length; i++) {
                // Using '==' for loose type comparison between string attribute and potential number ID
                if (allSheetData[i].id == playlistId) {
                    playlist = allSheetData[i];
                    break;
                }
            }
            if (playlist) {
                window.populateEditForm(playlist);
            } else {
                console.error('Playlist with ID ' + playlistId + ' not found for editing.');
                window.showAlert('لم يتم العثور على القائمة للتعديل. قد تحتاج إلى تحديث الصفحة.');
            }
        } else if (!isDeleteButton && !isEditButton) {
            // Clicked on the card itself (not on action buttons)
            window.toggleSongHighlight(card);
        }
    }

    /**
     * Toggles highlighting of songs in a playlist card
     * @param {HTMLElement} card - The playlist card element
     */
    function toggleSongHighlight(card) {
        // Remove highlighting from all other cards first
        var allCards = document.querySelectorAll('.playlist-card');
        for (var i = 0; i < allCards.length; i++) {
            if (allCards[i] !== card) {
                allCards[i].classList.remove('selected');
                var songItems = allCards[i].querySelectorAll('.playlist-songs li');
                for (var j = 0; j < songItems.length; j++) {
                    songItems[j].classList.remove('song-highlighted');
                }
            }
        }

        // Toggle highlighting for the clicked card
        var isCurrentlySelected = card.classList.contains('selected');
        if (isCurrentlySelected) {
            card.classList.remove('selected');
            var songItems = card.querySelectorAll('.playlist-songs li');
            for (var k = 0; k < songItems.length; k++) {
                songItems[k].classList.remove('song-highlighted');
            }
        } else {
            card.classList.add('selected');
            var songItems = card.querySelectorAll('.playlist-songs li');
            for (var k = 0; k < songItems.length; k++) {
                songItems[k].classList.add('song-highlighted');
            }
            
            // Force reflow to ensure icon colors are applied immediately
            card.offsetHeight;
        }
    }

    // Make functions globally accessible
    window.handleFormSubmit = handleFormSubmit;
    window.handlePlaylistAction = handlePlaylistAction;
    window.toggleSongHighlight = toggleSongHighlight;
})();
