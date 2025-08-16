// User page script for browser compatibility
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
        // Check if user is logged in
        var currentUser = localStorage.getItem('currentUser');
        if (!currentUser) {
            window.location.href = 'login.html';
            return;
        }

        var playlistSection = document.getElementById('playlist-section');
        var deleteArchiveBtn = document.getElementById('delete-archive-btn');

        function displayArchivedPlaylists() {
            var archivedPlaylists = JSON.parse(localStorage.getItem('archivedPlaylists')) || [];
            
            if (!playlistSection) return;

            playlistSection.innerHTML = '';
            if (archivedPlaylists.length === 0) {
                playlistSection.innerHTML = '<p class="card">الأرشيف فارغ حالياً.</p>';
                return;
            }

            // Sort by most recent date first
            archivedPlaylists.sort(function(a, b) {
                return new Date(b.date) - new Date(a.date);
            });

            archivedPlaylists.forEach(function(playlist) {
                // Use the new reusable card creation function from view.js
                var card = window.createPlaylistCard(playlist, true);
                playlistSection.appendChild(card);
            });
        }

        function clearAllArchives() {
            window.showConfirm('هل أنت متأكد من حذف جميع بيانات الأرشيف نهائياً؟ لا يمكن التراجع عن هذا الإجراء.')
                .then(function(confirmed) {
                    if (confirmed) {
                        localStorage.removeItem('archivedPlaylists');
                        displayArchivedPlaylists();
                    }
                });
        }
        
        function deleteSingleArchive(id) {
            window.showConfirm('هل أنت متأكد من حذف هذه القائمة من الأرشيف؟')
                .then(function(confirmed) {
                    if (confirmed) {
                        // Try to delete from Google Sheet as well to ensure consistency
                        window.postDataToSheet({ action: 'delete', id: id })
                            .catch(function(error) {
                                console.error('Error deleting from Google Sheet:', error);
                                // Continue with local deletion even if Google Sheet deletion fails
                            })
                            .finally(function() {
                                var archivedPlaylists = JSON.parse(localStorage.getItem('archivedPlaylists')) || [];
                                var updatedArchive = archivedPlaylists.filter(function(p) {
                                    return p.id.toString() !== id.toString();
                                });
                                localStorage.setItem('archivedPlaylists', JSON.stringify(updatedArchive));
                                displayArchivedPlaylists();
                            });
                    }
                });
        }

        /**
         * Toggles highlighting of songs in an archived playlist card
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

        if (playlistSection) {
            playlistSection.addEventListener('click', function(e) {
                var card = e.target.closest('.playlist-card');
                if (!card) return;

                var deleteButton = e.target.closest('.single-delete-btn');
                var cardActions = e.target.closest('.playlist-actions');

                if (deleteButton) {
                    var id = card.getAttribute('data-id');
                    if (id) {
                        deleteSingleArchive(id);
                    }
                } else if (!cardActions) {
                    // Clicked on the card itself, but not on an action button
                    window.toggleSongHighlight(card);
                }
            });
        }

        if (deleteArchiveBtn) {
            deleteArchiveBtn.addEventListener('click', clearAllArchives);
        }

        // Listen for archive updates from main page sync
        window.addEventListener('archiveUpdate', displayArchivedPlaylists);

        // Initial load
        displayArchivedPlaylists();
        
        // Enhanced refresh - sync every 3 seconds to match main page
        setInterval(displayArchivedPlaylists, 3000);

        // Force refresh when window becomes visible
        window.addEventListener('focus', function() {
            displayArchivedPlaylists();
        });

        // Force refresh when page becomes visible
        document.addEventListener('visibilitychange', function() {
            if (!document.hidden) {
                displayArchivedPlaylists();
            }
        });
    });
})();