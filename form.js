// --- Functions for managing the playlist form ---
(function() {
    'use strict';

    /**
     * Attaches an auto-resize listener to a textarea element.
     * The textarea will expand vertically to fit its content.
     * @param {HTMLTextAreaElement} textarea - The textarea element.
     */
    function enableAutoresize(textarea) {
        if (!textarea) return;
        
        const autoresizeHandler = () => {
            textarea.style.height = 'auto';
            // A small buffer helps prevent scrollbars on single-line textareas
            const buffer = 2; 
            textarea.style.height = (textarea.scrollHeight + buffer) + 'px';
        };

        textarea.addEventListener('input', autoresizeHandler);
        textarea.addEventListener('change', autoresizeHandler); // For initial population
        
        // Trigger it once initially in case there's pre-filled content
        setTimeout(autoresizeHandler, 10); 
    }
    
    /**
     * Updates the day name display when date changes
     * @param {HTMLInputElement} dateInput - The date input element
     * @param {HTMLElement} dayNameDisplay - The element to display the day name
     */
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

    /* @tweakable Message for when the date is available */
    const dateAvailableMessage = "التاريخ غير محجوز لحد الأن";
    /* @tweakable Message for when the date is booked */
    const dateBookedMessage = "للأسف التاريخ محجوز";
    /* @tweakable Message for when a past date is entered */
    const dateInPastMessage = "أدخلت تاريخاً قديماً";

    /**
     * Disables or enables form fields, except for the date input.
     * @param {boolean} disabled - True to disable, false to enable.
     */
    function setFormFieldsDisabled(disabled) {
        const dom = window.getDOMElements();
        
        // List of inputs to toggle, excluding the date input
        const inputsToToggle = [
            dom.eventLocationInput,
            dom.phoneNumberInput,
            dom.brideZaffaInput,
            dom.groomZaffaInput
        ];

        inputsToToggle.forEach(input => {
            if (input) input.disabled = disabled;
        });
        
        // Disable all song inputs and their remove buttons
        const songGroups = dom.songsContainer.querySelectorAll('.song-input-group');
        songGroups.forEach(group => {
            const input = group.querySelector('.song-input');
            const removeBtn = group.querySelector('.remove-song-btn');
            if (input) input.disabled = disabled;
            if (removeBtn) removeBtn.disabled = disabled;
        });

        // Disable add song button
        if (dom.addSongBtn) {
            dom.addSongBtn.disabled = disabled;
        }

        // Disable save button
        if (dom.saveBtn) {
            dom.saveBtn.disabled = disabled;
        }
    }

    /**
     * Updates the date availability message below the date input.
     * @param {boolean|null|string} isAvailable - true if available, false if booked, 'past' if in the past, null to hide.
     */
    function updateDateAvailabilityMessage(isAvailable) {
        var dom = window.getDOMElements();
        if (!dom.dateAvailabilityMessage) return;

        if (isAvailable === null) {
            dom.dateAvailabilityMessage.className = 'availability-message';
            dom.dateAvailabilityMessage.textContent = '';
            dom.dateAvailabilityMessage.style.display = 'none';
            setFormFieldsDisabled(false); // Enable fields
        } else if (isAvailable === 'past') {
            dom.dateAvailabilityMessage.className = 'availability-message booked';
            dom.dateAvailabilityMessage.textContent = dateInPastMessage;
            dom.dateAvailabilityMessage.style.display = 'block';
            setFormFieldsDisabled(true); // Disable fields
        } else if (isAvailable) {
            dom.dateAvailabilityMessage.className = 'availability-message available';
            dom.dateAvailabilityMessage.textContent = dateAvailableMessage;
            dom.dateAvailabilityMessage.style.display = 'block';
            setFormFieldsDisabled(false); // Enable fields
        } else {
            dom.dateAvailabilityMessage.className = 'availability-message booked';
            dom.dateAvailabilityMessage.textContent = dateBookedMessage;
            dom.dateAvailabilityMessage.style.display = 'block';
            setFormFieldsDisabled(true); // Disable fields
        }
    }

    /**
     * Shows or hides the main form section.
     * @param {boolean} show - `true` to show, `false` to hide.
     */
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

    /**
     * Adds a new song input field to the form.
     * @param {HTMLElement} container - The container to add the song field to.
     * @param {boolean} focusNew - Whether to focus the new input field.
     * @param {string} [value=''] - An optional initial value for the input.
     */
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

        if (focusNew) {
            input.focus();
        }
    }

    /* @tweakable The maximum number of songs allowed in a playlist. */
    const maxSongs = 10;

    /* @tweakable Prevent adding a new song if the last input is empty. */
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
    
    /**
     * Resets the form to its initial state.
     */
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
        
        // Setup autoresize for static textareas
        [dom.notesInput].forEach(enableAutoresize);
        
        // Setup auto-expand for static inputs
        [dom.eventLocationInput, dom.brideZaffaInput, dom.groomZaffaInput].forEach(setupAutoExpand);

        addSongField(dom.songsContainer, false);
        
        updateDayNameDisplay(dom.eventDateInput, dom.dayNameDisplay);
        
        showForm(false);
    }

    /**
     * Populates the form with data from a playlist for editing.
     * @param {object} playlist - The playlist object to edit.
     */
    function populateEditForm(playlist) {
        var dom = window.getDOMElements();
        
        resetForm();
        showForm(true);
        
        dom.formTitle.innerHTML = '<i class="fas fa-edit"></i> تعديل القائمة';
        dom.saveBtn.textContent = 'حفظ التعديلات';
        dom.playlistIdInput.value = playlist.id;

        // The stored date is a 'YYYY-MM-DD' string, which new Date() interprets as local time.
        // We need to treat it as a UTC date to avoid timezone shifts.
        var eventDate = new Date(playlist.date);
        if (!isNaN(eventDate.getTime())) {
            // By using UTC methods, we ensure the date string is correctly reconstructed regardless of browser timezone.
            const yyyy = eventDate.getUTCFullYear();
            const mm = String(eventDate.getUTCMonth() + 1).padStart(2, '0');
            const dd = String(eventDate.getUTCDate()).padStart(2, '0');
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
        
        // Trigger autoresize for notes field
        if (dom.notesInput) {
            setTimeout(() => dom.notesInput.dispatchEvent(new Event('change')), 10);
        }
        
        // Trigger auto-expand for text inputs
        [dom.eventLocationInput, dom.brideZaffaInput, dom.groomZaffaInput].forEach(input => {
            if (input) {
                setTimeout(() => input.dispatchEvent(new Event('input')), 10);
            }
        });

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

        // Add one empty field at the end if not exceeding max songs
        if (songs.length < maxSongs) {
            addSongField(dom.songsContainer, true);
        }
    }

    /**
     * Wraps an auto-expanding input in its necessary container.
     * @param {HTMLInputElement} inputEl - The input element to wrap.
     */
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

    // Make functions globally accessible
    window.updateDayNameDisplay = updateDayNameDisplay;
    window.updateDateAvailabilityMessage = updateDateAvailabilityMessage;
    window.showForm = showForm;
    window.requestAddSongField = requestAddSongField;
    window.resetForm = resetForm;
    window.populateEditForm = populateEditForm;

})();