// --- Functions for rendering UI components ---
(function() {
    'use strict';

    /**
     * Updates the content of an existing playlist card element in place.
     * This avoids re-creating the whole element and prevents visual flickering.
     * @param {HTMLElement} card - The card element to update.
     * @param {object} playlist - The new playlist data.
     */
    function updateCardInPlace(card, playlist) {
        // --- Safely parse songs ---
        var songs = [];
        try {
            if (Array.isArray(playlist.songs)) {
                songs = playlist.songs;
            } else if (typeof playlist.songs === 'string' && playlist.songs.trim().startsWith('[')) {
                songs = JSON.parse(playlist.songs);
            }
        } catch (e) {
            console.error('Error parsing songs for inplace update:', e);
            songs = []; // Default to empty on error
        }
        var songsHtml = songs.length > 0
            ? '<ol>' + songs.map(song => '<li>' + song + '</li>').join('') + '</ol>'
            : '<p>لا يوجد أغاني إضافية.</p>';

        // --- Prepare other data points ---
        var eventDate = new Date(playlist.date);
        var dateString = !isNaN(eventDate.getTime()) ?
            eventDate.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) :
            'تاريخ غير محدد';
        var dayName = !isNaN(eventDate.getTime()) ? window.getArabicDayName(eventDate) : '';

        /* @tweakable Placeholder text for notes when empty */
        const emptyNotesText = "لا توجد ملاحظات.";
        var notesText = playlist.notes ? playlist.notes.replace(/\n/g, '<br>') : `<em>${emptyNotesText}</em>`;

        // --- Update DOM elements ---
        card.querySelector('.location-text').textContent = playlist.location || 'مكان غير محدد';
        card.querySelector('.date-text').innerHTML = `${dateString}${dayName ? ` <span class="day-name">${dayName}</span>` : ''}`;
        card.querySelector('.phone-text').textContent = playlist.phoneNumber || 'غير محدد';
        card.querySelector('.bride-zaffa-text').textContent = playlist.brideZaffa || 'غير محدد';
        card.querySelector('.groom-zaffa-text').textContent = playlist.groomZaffa || 'غير محدد';
        card.querySelector('.playlist-songs .songs-content').innerHTML = songsHtml;
        card.querySelector('.playlist-notes .notes-content').innerHTML = notesText;

        // --- Store the new data on the element for future comparisons ---
        try {
            card.dataset.playlistData = JSON.stringify(playlist);
        } catch (e) {
            console.error("Failed to stringify playlist data for card dataset", e);
        }
    }

    /**
     * Creates an HTML element for a single playlist card.
     * @param {object} playlist - The playlist data object.
     * @param {boolean} isArchived - True if the card is for the archive page.
     * @returns {HTMLElement} The card element.
     */
    function createPlaylistCard(playlist, isArchived) {
        var songs = [];
        try {
            // Handle both array (from optimistic update) and string (from initial load)
            if (Array.isArray(playlist.songs)) {
                songs = playlist.songs;
            } else if (typeof playlist.songs === 'string' && playlist.songs.trim().startsWith('[')) {
                var parsedSongs = JSON.parse(playlist.songs);
                if (Array.isArray(parsedSongs)) songs = parsedSongs;
            }
        } catch (e) { console.error('Error parsing songs for display:', e); }

        var songsHtml = songs.length > 0 ?
            '<ol>' + songs.map(function(song) { return '<li>' + song + '</li>'; }).join('') + '</ol>' :
            '<p>لا يوجد أغاني إضافية.</p>';

        var eventDate = new Date(playlist.date);
        var dateString = !isNaN(eventDate.getTime()) ?
            eventDate.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) :
            'تاريخ غير محدد';
        
        var dayName = !isNaN(eventDate.getTime()) ? window.getArabicDayName(eventDate) : '';

        var actionsHtml = isArchived ?
            '<button class="action-btn delete-btn single-delete-btn"><i class="fas fa-trash-alt"></i> حذف من الأرشيف</button>' :
            '<button class="action-btn edit-btn"><i class="fas fa-edit"></i> تعديل</button>' +
            '<button class="action-btn delete-btn"><i class="fas fa-trash-alt"></i> حذف</button>';

        var notesText = playlist.notes ? playlist.notes.replace(/\n/g, '<br>') : `<em>${"لا توجد ملاحظات."}</em>`;

        var creationTimestampHtml = '';
        // The ID is a timestamp from when the playlist was created.
        // We check to ensure it's a number and not a user ID like 'user_...'.
        var creationTimestamp = parseInt(playlist.id, 10);
        if (!isNaN(creationTimestamp) && !playlist.id.toString().startsWith('user_')) {
            var creationDate = new Date(creationTimestamp);
            var formattedDate = creationDate.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
            var formattedTime = creationDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
            
            /* @tweakable Template for the creation timestamp text. Placeholders: {date}, {time}. */
            const timestampTemplate = 'تم الإنشاء في: {date} - {time}';
            const timestampText = timestampTemplate.replace('{date}', formattedDate).replace('{time}', formattedTime);
            
            creationTimestampHtml = `<div class="creation-timestamp">${timestampText}</div>`;
        }

        var card = document.createElement('div');
        card.className = 'playlist-card card';
        card.setAttribute('data-id', playlist.id);
        
        // Store the initial data on the element for comparison during updates
        try {
            card.dataset.playlistData = JSON.stringify(playlist);
        } catch(e) {
            console.error("Failed to stringify playlist data for card dataset", e);
            card.dataset.playlistData = '{}';
        }
        
        var isAdmin = localStorage.getItem('isAdmin') === 'true';
        var creatorInfoHtml = '';
        if (isAdmin && playlist.username) {
            creatorInfoHtml = `<div class="creator-info"><i class="fas fa-user-circle"></i> مقدم الطلب: <strong>${playlist.username}</strong></div>`;
        }

        card.innerHTML =
            creatorInfoHtml +
            '<div class="playlist-card-header">' +
                '<h3><i class="fas fa-map-marker-alt icon"></i> <span class="location-text">' + (playlist.location || 'مكان غير محدد') + '</span></h3>' +
                '<span><i class="fas fa-calendar-alt icon"></i> <span class="date-text">' + dateString +
                (dayName ? ' <span class="day-name">' + dayName + '</span>' : '') + '</span></span>' +
            '</div>' +
            '<div class="playlist-card-info">' +
                '<p><i class="fas fa-phone icon"></i> <strong>رقم الهاتف:</strong> <span class="phone-text">' + (playlist.phoneNumber || 'غير محدد') + '</span></p>' +
                '<p><i class="fas fa-female icon"></i> <strong>زفة العروس:</strong> <span class="bride-zaffa-text">' + (playlist.brideZaffa || 'غير محدد') + '</span></p>' +
                '<p><i class="fas fa-male icon"></i> <strong>زفة المعرس:</strong> <span class="groom-zaffa-text">' + (playlist.groomZaffa || 'غير محدد') + '</span></p>' +
            '</div>' +
            '<div class="playlist-songs">' +
                '<h4><i class="fas fa-music icon"></i>' + (isArchived ? 'قائمة الأغاني:' : 'الأغاني المطلوبة :') + '</h4>' +
                '<div class="songs-content">' + songsHtml + '</div>' +
            '</div>' +
            '<div class="playlist-notes">' +
                '<h4><i class="fas fa-sticky-note icon"></i> ملاحظات:</h4>' +
                '<p class="notes-content">' + notesText + '</p>' +
            '</div>' +
            '<div class="playlist-actions">' +
                '<div class="action-buttons-wrapper">' + actionsHtml + '</div>' +
                creationTimestampHtml +
            '</div>';
        
        return card;
    }

    /**
     * Renders the list of playlist cards on the main page by reconciling the DOM.
     * It adds, removes, or updates cards as needed without redrawing the entire list.
     * @param {HTMLElement} container - The element to render the cards into.
     * @param {Array} newPlaylists - The new, sorted array of playlist objects.
     */
    function renderPlaylists(container, newPlaylists) {
        if (!container) return;

        const existingCards = Array.from(container.querySelectorAll('.playlist-card'));
        const existingCardMap = new Map(existingCards.map(card => [card.getAttribute('data-id'), card]));
        const newPlaylistsMap = new Map(newPlaylists.map(p => [p.id.toString(), p]));

        // 1. Remove cards that are no longer in the new list
        for (const [id, card] of existingCardMap) {
            if (!newPlaylistsMap.has(id)) {
                card.remove();
            }
        }

        // 2. Update existing cards and add new ones in the correct order
        let lastCard = null; // Keep track of the last processed card for insertion order
        for (const playlist of newPlaylists) {
            const playlistId = playlist.id.toString();
            const existingCard = existingCardMap.get(playlistId);

            if (existingCard) {
                // It exists, so update it only if data has changed
                let currentData = {};
                try {
                    currentData = JSON.parse(existingCard.dataset.playlistData || '{}');
                } catch(e) { /* ignore parse error, will default to update */ }
                
                // Compare new data with the stored data on the element
                if (JSON.stringify(currentData) !== JSON.stringify(playlist)) {
                    updateCardInPlace(existingCard, playlist);
                }
                lastCard = existingCard;
            } else {
                // It's a new card, create it and insert it
                const newCard = createPlaylistCard(playlist, false);
                if (lastCard) {
                    // Insert after the last known correct card
                    lastCard.insertAdjacentElement('afterend', newCard);
                } else {
                    // Insert at the beginning of the container
                    container.prepend(newCard);
                }
                lastCard = newCard;
            }
        }
    }

    /**
     * Updates a single playlist card in the DOM or creates it if it doesn't exist.
     * This is more efficient than re-rendering the entire list.
     * @param {object} playlist - The playlist data object to render/update.
     */
    function renderOrUpdatePlaylistCard(playlist) {
        const container = window.getDOMElements().playlistSection;
        if (!container) return;
    
        const existingCard = container.querySelector(`.playlist-card[data-id="${playlist.id}"]`);
        
        if (existingCard) {
            // Update the existing card in place to avoid flickering
            updateCardInPlace(existingCard, playlist);
            // Highlight the card to show it was updated
            existingCard.classList.add('edited');
            setTimeout(() => {
                if (existingCard) existingCard.classList.remove('edited');
            }, window.cardHighlightDuration || 1500);
        } else {
            // If it's a new card, create it
            const newCard = createPlaylistCard(playlist, false);
            
            // Find its correct sorted position and insert it
            const allPlaylists = window.getAllPlaylists(); // This now includes the new one
            const playlistIndex = allPlaylists.findIndex(p => p.id === playlist.id);
            const cards = Array.from(container.querySelectorAll('.playlist-card'));
    
            // Find the ID of the card that should be *after* our new card
            let nextCardId = null;
            if (playlistIndex < allPlaylists.length - 1) {
                nextCardId = allPlaylists[playlistIndex + 1].id;
            }
    
            const nextCardElement = nextCardId ? container.querySelector(`.playlist-card[data-id="${nextCardId}"]`) : null;
    
            if (nextCardElement) {
                container.insertBefore(newCard, nextCardElement);
            } else {
                container.appendChild(newCard); // Append at the end if it's the latest date
            }
    
            // Highlight the new card
            newCard.classList.add('edited');
            setTimeout(() => {
                if (newCard) newCard.classList.remove('edited');
            }, window.newCardHighlightDuration || 2500);
        }
    }

    /**
     * Toggles highlighting of songs in a playlist card.
     * @param {HTMLElement} card - The playlist card element to highlight.
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
    window.createPlaylistCard = createPlaylistCard;
    window.renderPlaylists = renderPlaylists;
    window.renderOrUpdatePlaylistCard = renderOrUpdatePlaylistCard;
    window.toggleSongHighlight = toggleSongHighlight;

})();