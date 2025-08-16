// --- Functions for managing the playlist form ---
(function() {
    'use strict';

    /**
     * Attaches an auto-resize listener to a textarea element.
     */
    function enableAutoresize(textarea) {
        if (!textarea) return;
        
        const autoresizeHandler = () => {
            textarea.style.height = 'auto';
            const buffer = 2; 
            textarea.style.height = (textarea.scrollHeight + buffer) + 'px';
        };

        textarea.addEventListener('input', autoresizeHandler);
        textarea.addEventListener('change', autoresizeHandler); 
        setTimeout(autoresizeHandler, 10); 
    }
    
    function updateDayNameDisplay(dateInput, dayNameDisplay) {
        if (!dateInput || !dayNameDisplay) return;
        if (dateInput.value) {
            var selectedDate = new Date(dateInput.value);
            if (!isNaN(selectedDate.getTime())) {
                var dayName = window.getArabicDayName(selectedDate);
                dayNameDisplay.textContent = dayName;
            } else {
                dayNameDisplay.textContent = '';
            }
        } else {
            dayNameDisplay.textContent = '';
        }
    }

    const dateAvailableMessage = "التاريخ غير محجوز لحد الأن";
    const dateBookedMessage = "للأسف التاريخ محجوز";
    const dateInPastMessage = "أدخلت تاريخاً قديماً";

    function setFormFieldsDisabled(disabled) {
        const dom = window.getDOMElements();
        const inputsToToggle = [
            dom.eventLocationInput,
            dom.phoneNumberInput,
            dom.brideZaffaInput,
            dom.groomZaffaInput
        ];

        inputsToToggle.forEach(input => {
            if (input) input.disabled = disabled;
        });
        
        const songGroups = dom.songsContainer.querySelectorAll('.song-input-group');
        songGroups.forEach(group => {
            const input = group.querySelector('.song-input');
            const removeBtn = group.querySelector('.remove-song-btn');
            if (input) input.disabled = disabled;
            if (removeBtn) removeBtn.disabled = disabled;
        });

        if (dom.addSongBtn) dom.addSongBtn.disabled = disabled;
        if (dom.saveBtn) dom.saveBtn.disabled = disabled;
    }

    function updateDateAvailabilityMessage(isAvailable) {
        var dom = window.getDOMElements();
        if (!dom.dateAvailabilityMessage) return;

        if (isAvailable === null) {
            dom.dateAvailabilityMessage.className = 'availability-message';
            dom.dateAvailabilityMessage.textContent = '';
            dom.dateAvailabilityMessage.style.display = 'none';
            setFormFieldsDisabled(false);
        } else if (isAvailable === 'past') {
            dom.dateAvailabilityMessage.className = 'availability-message booked';
            dom.dateAvailabilityMessage.textContent = dateInPastMessage;
            dom.dateAvailabilityMessage.style.display = 'block';
            setFormFieldsDisabled(true);
        } else if (isAvailable) {
            dom.dateAvailabilityMessage.className = 'availability-message available';
            dom.dateAvailabilityMessage.textContent = dateAvailableMessage;
            dom.dateAvailabilityMessage.style.display = 'block';
            setFormFieldsDisabled(false);
        } else {
            dom.dateAvailabilityMessage.className = 'availability-message booked';
            dom.dateAvailabilityMessage.textContent = dateBookedMessage;
            dom.dateAvailabilityMessage.style.display = 'block';
            setFormFieldsDisabled(true);
        }
    }

    function showForm(show) {
        var elements = window.getDOMElements();
        var formSection = elements.formSection;
        var showFormBtn = elements.showFormBtn;
        
        if (formSection) {
            formSection.classList.toggle('hidden', !show);
        }
        if (showFormBtn) {
            showFormBtn.classList.toggle('hidden', show);
        }
        if (show) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    function addSongField(container, focusNew, value) {
        value = value || '';
        var group = document.createElement('div');
        group.className = 'song-input-group';

        var inputContainer = document.createElement('div');
        inputContainer.className = 'auto-expand-input-container song-input-container';
        inputContainer.dataset.value = value;

        var input = document.createElement('input');
        input.type = 'text';
        input.className = 'song-input auto-expand-input';
        input.placeholder = 'أدخل اسم الأغنية';
        input.value = value;
        
        input.addEventListener('input', () => {
            inputContainer.dataset.value = input.value;
        });

        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                requestAddSongField();
            }
        });

        var removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'remove-song-btn';
        removeBtn.innerHTML = '<i class="fas fa-times-circle"></i>';
        removeBtn.onclick = function() {
            if (input.value.trim() === '') {
                if (group.parentNode) group.parentNode.removeChild(group);
                return;
            }
            
            window.showConfirm(window.songDeleteConfirmationMessage, 'تأكيد الحذف')
                .then(function(confirmed) {
                    if (confirmed) {
                        if (group.parentNode) group.parentNode.removeChild(group);
                    }
                });
        };

        inputContainer.appendChild(input);
        group.appendChild(inputContainer);
        group.appendChild(removeBtn);
        container.appendChild(group);

        if (focusNew) input.focus();
    }

    const maxSongs = 10;
    const preventEmptySongOnAdd = true;

    function requestAddSongField() {
        const dom = window.getDOMElements();
        const songInputs = dom.songsContainer.querySelectorAll('.song-input');
        
        if (songInputs.length >= maxSongs) {
            window.showAlert('لا يمكن إضافة أكثر من ' + maxSongs + ' أغاني.');
            return;
        }

        if (preventEmptySongOnAdd) {
            if (songInputs.length > 0) {
                const lastSongInput = songInputs[songInputs.length - 1];
                if (lastSongInput && lastSongInput.value.trim() === '') {
                    lastSongInput.focus();
                    return;
                }
            }
        }
        addSongField(dom.songsContainer, true);
    }
    
    function resetForm() {
        var dom = window.getDOMElements();
        if (!dom.playlistForm) return;

        dom.playlistForm.reset();
        dom.songsContainer.innerHTML = '';
        dom.playlistIdInput.value = '';
        dom.notesInput.value = '';
        dom.formTitle.innerHTML = '<i class="fas fa-plus-circle"></i> إضافة قائمة جديدة';
        dom.saveBtn.textContent = 'حفظ البيانات';
        dom.dayNameDisplay.textContent = '';
        updateDateAvailabilityMessage(null);
        
        [dom.notesInput].forEach(enableAutoresize);
        [dom.eventLocationInput, dom.brideZaffaInput, dom.groomZaffaInput].forEach(setupAutoExpand);

        addSongField(dom.songsContainer, false);
        updateDayNameDisplay(dom.eventDateInput, dom.dayNameDisplay);
        
        showForm(false);
    }

    function populateEditForm(playlist) {
        var dom = window.getDOMElements();
        
        resetForm();
        showForm(true);
        
        dom.formTitle.innerHTML = '<i class="fas fa-edit"></i> تعديل القائمة';
        dom.saveBtn.textContent = 'حفظ التعديلات';
        dom.playlistIdInput.value = playlist.id;

        var eventDate = new Date(playlist.date);
        if (!isNaN(eventDate.getTime())) {
            const adjustedDate = new Date(eventDate.getTime() + (4 * 3600000));
            const yyyy = adjustedDate.getUTCFullYear();
            const mm = String(adjustedDate.getUTCMonth() + 1).padStart(2, '0');
            const dd = String(adjustedDate.getUTCDate()).padStart(2, '0');
            dom.eventDateInput.value = `${yyyy}-${mm}-${dd}`;
            updateDayNameDisplay(dom.eventDateInput, dom.dayNameDisplay);
        } else {
            dom.eventDateInput.value = '';
            dom.dayNameDisplay.textContent = '';
        }

        dom.eventLocationInput.value = playlist.location;
        dom.phoneNumberInput.value = playlist.phoneNumber;
        dom.brideZaffaInput.value = playlist.brideZaffa;
        dom.groomZaffaInput.value = playlist.groomZaffa;
        dom.notesInput.value = playlist.notes || '';
        
        if (dom.notesInput) {
            setTimeout(() => dom.notesInput.dispatchEvent(new Event('change')), 10);
        }
        
        [dom.eventLocationInput, dom.brideZaffaInput, dom.groomZaffaInput].forEach(input => {
            if (input) {
                setTimeout(() => input.dispatchEvent(new Event('input')), 10);
            }
        });
        
        /* @tweakable The duration in milliseconds for the song fields to fade in when editing a playlist. */
        const songsFadeInDuration = 150; 
        
        // Hide songs container to prevent flicker
        dom.songsContainer.style.opacity = '0';
        dom.songsContainer.innerHTML = '';

        var songs = [];
        try {
            if (typeof playlist.songs === 'string' && playlist.songs.trim().startsWith('[')) {
                var parsedSongs = JSON.parse(playlist.songs);
                if (Array.isArray(parsedSongs)) songs = parsedSongs;
            }
        } catch(e) { 
            console.error('Error parsing songs for editing:', e); 
        }

        songs.forEach(function(song) {
            addSongField(dom.songsContainer, false, song);
        });

        if (songs.length < maxSongs) {
            addSongField(dom.songsContainer, true);
        }

        // Fade songs back in for a smooth transition
        setTimeout(() => {
            dom.songsContainer.style.transition = `opacity ${songsFadeInDuration}ms ease-in-out`;
            dom.songsContainer.style.opacity = '1';
        }, 50); // A small delay to ensure styles apply correctly
    }

    function setupAutoExpand(inputEl) {
        if (!inputEl || inputEl.parentNode.classList.contains('auto-expand-input-container')) {
            return;
        }
        const container = document.createElement('div');
        container.className = 'auto-expand-input-container';
        inputEl.parentNode.insertBefore(container, inputEl);
        container.appendChild(inputEl);
        container.dataset.value = inputEl.value;
        inputEl.addEventListener('input', () => {
            container.dataset.value = inputEl.value;
        });
    }

    // ✅ دالة تحديث فوري بعد الحفظ أو التعديل
    function afterSuccessfulSaveOrEdit(updatedListFromServer) {
        try {
            if (Array.isArray(updatedListFromServer)) {
                localStorage.setItem('sheet_playlists_cache_v2', JSON.stringify(updatedListFromServer));
                localStorage.setItem('sheet_playlists_cache_time_v2', String(Date.now()));
            }
        } catch {}
        if (typeof window.updateLocalPlaylists === 'function') {
            const cached = JSON.parse(localStorage.getItem('sheet_playlists_cache_v2') || '[]');
            window.updateLocalPlaylists(cached);
        }
        if (typeof window.syncDataFromSheet === 'function') {
            window.syncDataFromSheet();
        }
    }

    // Make functions globally accessible
    window.updateDayNameDisplay = updateDayNameDisplay;
    window.updateDateAvailabilityMessage = updateDateAvailabilityMessage;
    window.showForm = showForm;
    window.requestAddSongField = requestAddSongField;
    window.resetForm = resetForm;
    window.populateEditForm = populateEditForm;
    window.afterSuccessfulSaveOrEdit = afterSuccessfulSaveOrEdit;

})();