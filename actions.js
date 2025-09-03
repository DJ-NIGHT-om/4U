// --- User Action Handlers ---
(function() {
    'use strict';

    /**
     * Handles the form submission for adding or editing a playlist.
     * @param {Event} e - The form submit event.
     */
    function handleFormSubmit(e) {
        e.preventDefault();
        const currentUser = localStorage.getItem('currentUser');
        const currentUserPassword = localStorage.getItem('currentUserPassword');
        const isAdmin = localStorage.getItem('isAdmin') === 'true';
        if (!currentUser) return;

        const dom = window.getDOMElements();
        
        // Validate date
        const selectedDate = new Date(dom.eventDateInput.value);
        const selectedDateUTC = new Date(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), selectedDate.getUTCDate());
        const appToday = window.getAppToday();
        
        if (selectedDateUTC < appToday) {
            window.showAlert('لا يمكن اختيار تاريخ في الماضي. يرجى اختيار تاريخ اليوم أو تاريخ مستقبلي.');
            return;
        }

        // Gather form data
        const songs = Array.from(dom.songsContainer.querySelectorAll('.song-input'))
            .map(input => input.value.trim())
            .filter(Boolean);
        
        const playlistId = dom.playlistIdInput.value;
        const isEdit = playlistId && playlistId.trim() !== '';

        if (isEdit) {
            const originalPlaylist = window.getAllSheetData().find(p => p.id == playlistId);
            if (!originalPlaylist) {
                console.error("Original playlist not found for edit");
                window.showAlert("حدث خطأ: لم يتم العثور على القائمة الأصلية للتعديل.");
                return;
            }

            const updatedData = {
                id: playlistId,
                date: dom.eventDateInput.value,
                location: dom.eventLocationInput.value,
                phoneNumber: dom.phoneNumberInput.value,
                brideZaffa: dom.brideZaffaInput.value,
                groomZaffa: dom.groomZaffaInput.value,
                songs: songs,
                notes: dom.notesInput.value,
                username: originalPlaylist.username,
                password: originalPlaylist.password
            };
            
            window.updatePlaylist(playlistId, updatedData, originalPlaylist);

        } else { // This is an 'add' action
            if (isAdmin) {
                window.showAlert('لا يمكن للمدير إنشاء قوائم جديدة من هذه الواجهة.');
                return;
            }
            const isFirstPlaylist = !isAdmin && window.getAllPlaylists().length === 0;

            const newPlaylistData = {
                date: dom.eventDateInput.value,
                location: dom.eventLocationInput.value,
                phoneNumber: dom.phoneNumberInput.value,
                brideZaffa: dom.brideZaffaInput.value,
                groomZaffa: dom.groomZaffaInput.value,
                songs: songs,
                notes: dom.notesInput.value,
                username: currentUser,
                password: currentUserPassword || ''
            };
            
            window.addPlaylist(newPlaylistData, isFirstPlaylist);
        }
    }
    
    /**
     * Handles clicks on the edit and delete buttons within a playlist card.
     * @param {Event} e - The click event.
     */
    function handlePlaylistAction(e) {
        const card = e.target.closest('.playlist-card');
        if (!card) return;

        const playlistId = card.getAttribute('data-id');
        const isDeleteButton = e.target.closest('.delete-btn');
        const isEditButton = e.target.closest('.edit-btn');

        if (isDeleteButton) {
            window.showConfirm('هل أنت متأكد من حذف هذه القائمة؟')
                .then(confirmed => {
                    if (confirmed) {
                        window.deletePlaylist(playlistId, card);
                    }
                });
        } else if (isEditButton) {
            const allSheetData = window.getAllSheetData();
            const playlist = allSheetData.find(p => p.id == playlistId);

            if (playlist) {
                window.populateEditForm(playlist);
            } else {
                console.error('Playlist with ID ' + playlistId + ' not found for editing.');
                window.showAlert('لم يتم العثور على القائمة للتعديل. قد تحتاج إلى تحديث الصفحة.');
            }
        } else {
            // Clicked on the card itself (not on action buttons)
            window.toggleSongHighlight(card);
        }
    }

    // Make functions globally accessible
    window.handleFormSubmit = handleFormSubmit;
    window.handlePlaylistAction = handlePlaylistAction;
})();