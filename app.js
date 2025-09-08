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

    // --- APP STATE ---
    let loggedInUser = null;
    let currentPassword = null;
    let usersData = null;

    // --- EVENT LISTENERS ---

    // 1. Handle Login
    submitButton.addEventListener('click', () => {
        const password = passwordInput.value;
        const selectedUserRadio = document.querySelector('input[name="icon"]:checked');

        if (!password || !selectedUserRadio) {
            errorMessage.textContent = 'Please select a user and enter the password.';
            return;
        }

        loggedInUser = selectedUserRadio.value;
        currentPassword = password; // Store the password for later use
        errorMessage.textContent = 'Loading...';

        // Fetch initial data from Google Sheet using a GET request
        fetch(APP_SCRIPT_URL)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    throw new Error(data.error);
                }
                // NOTE: We trust the Apps Script for password verification on POST,
                // so we don't need a password check here for the initial data load.
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

    // 2. Handle Update Button Clicks
    userCardsContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('update-button')) {
            const userCard = event.target.closest('.user-card');
            const username = userCard.dataset.username;

            const localInput = userCard.querySelector('.local-points-input');
            const globalInput = userCard.querySelector('.global-points-input');
            const reasonInput = userCard.querySelector('.reason-input');

            const newLocal = parseInt(localInput.value, 10);
            const newGlobal = parseInt(globalInput.value, 10);
            const reason = reasonInput.value.trim();

            if (isNaN(newLocal) || isNaN(newGlobal)) {
                alert('Please enter valid numbers for points.');
                return;
            }
             if (!reason) {
                alert('Please provide a reason for the update.');
                return;
            }

            // Disable button to prevent multiple clicks
            event.target.disabled = true;
            event.target.textContent = 'Updating...';

            // Prepare the data package to send to the Apps Script
            const requestData = {
                password: currentPassword,    // The password for authorization
                updated_by: loggedInUser,     // Who is making the change
                user_affected: username,      // Who is being changed
                reason: reason,               // Why the change is being made
                new_local: newLocal,
                new_global: newGlobal
            };

            // Send the update to the Google Apps Script using a POST request
            fetch(APP_SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify(requestData),
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(result => {
                if (result.status === 'success') {
                    // It worked! Refresh the page to see the new data.
                    location.reload(); 
                } else {
                    // The Apps Script sent back an error (e.g., wrong password)
                    throw new Error(result.message);
                }
            })
            .catch(error => {
                console.error('Update failed:', error);
                alert('Update failed: ' + error.message);
                // Re-enable button on failure
                event.target.disabled = false;
                event.target.textContent = 'Update';
            });
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

            card.innerHTML = `
                <img src="icons/${iconFilename}" alt="${user.username} icon" class="user-icon">
                <h3>${user.username}</h3>
                <p>Total Rewards: ${totalPoints}</p>
                <div class="update-container">
                    <label>Local:</label>
                    <input type="number" class="local-points-input" value="${user.current_local_points || 0}">
                </div>
                <div class="update-container">
                    <label>Global:</label>
                    <input type="number" class="global-points-input" value="${user.current_global_points || 0}">
                </div>
                <div class="update-container reason-container">
                    <label>Reason:</label>
                    <input type="text" class="reason-input" placeholder="Reason for update...">
                </div>
                <button class="update-button">Update</button>
            `;
            userCardsContainer.appendChild(card);
        });
    }
});
