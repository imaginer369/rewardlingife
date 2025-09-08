document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwwm4eiWDbmMxGADofaJCkjV0V7F3KgL3PfE-QeYwhaEexl9G_5uQhIu63R_FrXUZmIZA/exec';

    // --- DOM ELEMENTS ---
    const passwordContainer = document.getElementById('password-container');
    const dashboardContainer = document.getElementById('dashboard-container');
    const passwordInput = document.getElementById('password-input');
    const submitButton = document.getElementById('submit-password');
    const errorMessage = document.getElementById('error-message');
    const userCardsContainer = document.getElementById('user-cards-container');

    // --- MODAL ELEMENTS ---
    const modal = document.getElementById('add-points-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalLocalInput = document.getElementById('modal-local-points');
    const modalGlobalInput = document.getElementById('modal-global-points');
    const modalReasonInput = document.getElementById('modal-reason');
    const modalSubmitButton = document.getElementById('modal-submit-button');
    const closeModalButton = document.querySelector('.close-button');

    // --- APP STATE ---
    let loggedInUser = null;
    let currentPassword = null;
    let usersData = null;

    // --- EVENT LISTENERS ---

    // 1. Handle Login
    submitButton.addEventListener('click', () => {
        const password = passwordInput.value;
        const selectedUserRadio = document.querySelector('input[name=\"icon\"]:checked');

        if (!password || !selectedUserRadio) {
            errorMessage.textContent = 'Please select a user and enter the password.';
            return;
        }

        loggedInUser = selectedUserRadio.value;
        currentPassword = password;
        errorMessage.textContent = 'Loading...';

        fetch(APP_SCRIPT_URL)
            .then(response => response.json())
            .then(data => {
                if (data.error) { throw new Error(data.error); }
                errorMessage.textContent = '';
                passwordContainer.classList.add('hidden');
                dashboardContainer.classList.remove('hidden');
                usersData = data;
                displayUsers(usersData);
            })
            .catch(error => {
                console.error('Error fetching initial data:', error);
                errorMessage.textContent = 'Could not load data. Check the script URL and sheet permissions.';
            });
    });

    // 2. Handle "Add Points" button click on user cards
    userCardsContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('add-points-button')) {
            const userCard = event.target.closest('.user-card');
            const username = userCard.dataset.username;
            const user = usersData.find(u => u.username === username);

            if (user) {
                // Store current user info in the modal for later
                modal.dataset.username = user.username;
                modal.dataset.currentLocal = user.current_local_points || 0;
                modal.dataset.currentGlobal = user.current_global_points || 0;

                // Prepare and show the modal
                modalTitle.textContent = `Add Points for ${user.username}`;
                modalLocalInput.value = 0;
                modalGlobalInput.value = 0;
                modalReasonInput.value = '';
                modal.style.display = 'block';
            }
        }
    });

    // 3. Handle the final "Add" button click inside the modal
    modalSubmitButton.addEventListener('click', () => {
        // Retrieve stored user info
        const username = modal.dataset.username;
        const currentLocal = parseInt(modal.dataset.currentLocal, 10);
        const currentGlobal = parseInt(modal.dataset.currentGlobal, 10);

        // Get points to add from modal inputs
        const localToAdd = parseInt(modalLocalInput.value, 10);
        const globalToAdd = parseInt(modalGlobalInput.value, 10);
        const reason = modalReasonInput.value.trim();

        if (isNaN(localToAdd) || isNaN(globalToAdd)) {
            alert('Please enter valid numbers for points.');
            return;
        }
        if (!reason) {
            alert('Please provide a reason for the update.');
            return;
        }
        if (localToAdd === 0 && globalToAdd === 0) {
            alert('Please add at least one point.');
            return;
        }

        modalSubmitButton.disabled = true;
        modalSubmitButton.textContent = 'Adding...';

        // ** CRUCIAL: Calculate the new total by ADDING points **
        const newLocalTotal = currentLocal + localToAdd;
        const newGlobalTotal = currentGlobal + globalToAdd;

        const requestData = {
            password: currentPassword,
            updated_by: loggedInUser,
            user_affected: username,
            reason: reason,
            new_local: newLocalTotal,
            new_global: newGlobalTotal
        };

        // Send the update to the Google Apps Script
        fetch(APP_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(requestData),
            cache: 'no-store',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            }
        })
        .then(response => response.json())
        .then(result => {
            if (result.status === 'success') {
                location.reload(); // Success! Reload to see the new totals.
            } else {
                throw new Error(result.message);
            }
        })
        .catch(error => {
            console.error('Update failed:', error);
            alert('Update failed: ' + error.message);
            modalSubmitButton.disabled = false;
            modalSubmitButton.textContent = 'Add';
        });
    });

    // 4. Handle Modal Close
    closeModalButton.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    window.addEventListener('click', (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    });


    // --- UI RENDERING ---

    function displayUsers(users) {
        userCardsContainer.innerHTML = '';
        users.forEach(user => {
            const card = document.createElement('div');
            card.className = 'user-card';
            card.dataset.username = user.username;

            const totalPoints = (user.current_local_points || 0) + (user.current_global_points || 0);
            const iconFilename = user.username.toLowerCase() + '.png';

            // ** NEW, SIMPLIFIED CARD LAYOUT **
            card.innerHTML = `
                <img src=\"icons/${iconFilename}\" alt=\"${user.username} icon\" class=\"user-icon\">
                <h3>${user.username}</h3>
                <p>Local Points: ${user.current_local_points || 0}</p>
                <p>Global Points: ${user.current_global_points || 0}</p>
                <p><strong>Total Rewards: ${totalPoints}</strong></p>
                <button class=\"add-points-button\">Add Points</button>
            `;
            userCardsContainer.appendChild(card);
        });
    }
});
