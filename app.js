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

    // --- ADD MODAL ELEMENTS ---
    const addModal = document.getElementById('add-points-modal');
    const addModalTitle = document.getElementById('modal-title');
    const addModalLocalInput = document.getElementById('modal-local-points');
    const addModalGlobalInput = document.getElementById('modal-global-points');
    const addModalReasonInput = document.getElementById('modal-reason');
    const addModalSubmitButton = document.getElementById('modal-submit-button');

    // --- REDEEM MODAL ELEMENTS ---
    const redeemModal = document.getElementById('redeem-points-modal');
    const redeemModalTitle = document.getElementById('redeem-modal-title');
    const redeemModalLocalInput = document.getElementById('redeem-modal-local-points');
    const redeemModalGlobalInput = document.getElementById('redeem-modal-global-points');
    const redeemModalReasonInput = document.getElementById('redeem-modal-reason');
    const redeemModalSubmitButton = document.getElementById('redeem-modal-submit-button');

    // --- APP STATE ---
    let loggedInUser = null;
    let currentPassword = null;
    let usersData = null;

    // --- EVENT LISTENERS ---

    // 1. Handle Login
    submitButton.addEventListener('click', () => {
        const password = passwordInput.value;
        loggedInUser = 'rose'; // Default user
        currentPassword = password;

        if (!password) {
            errorMessage.textContent = 'Please enter the password.';
            return;
        }

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

    // 2. Handle Card Button Clicks (Event Delegation)
    userCardsContainer.addEventListener('click', (event) => {
        const userCard = event.target.closest('.user-card');
        if (!userCard) return;
        const username = userCard.dataset.username;
        const user = usersData.find(u => u.username === username);
        if (!user) return;

        const currentLocal = user.current_local_points || 0;
        const currentGlobal = user.current_global_points || 0;

        if (event.target.classList.contains('add-points-button')) {
            addModal.dataset.username = username;
            addModal.dataset.currentLocal = currentLocal;
            addModal.dataset.currentGlobal = currentGlobal;

            addModalTitle.textContent = `Add Points for ${username}`;
            addModalLocalInput.value = 0;
            addModalGlobalInput.value = 0;
            addModalReasonInput.value = '';
            addModal.style.display = 'block';
        }

        if (event.target.classList.contains('redeem-points-button')) {
            redeemModal.dataset.username = username;
            redeemModal.dataset.currentLocal = currentLocal;
            redeemModal.dataset.currentGlobal = currentGlobal;

            redeemModalTitle.textContent = `Redeem Points for ${username}`;
            redeemModalLocalInput.value = 0;
            redeemModalGlobalInput.value = 0;
            redeemModalReasonInput.value = '';
            redeemModal.style.display = 'block';
        }
    });

    // 3. Handle ADDING Points (Modal Submission)
    addModalSubmitButton.addEventListener('click', () => {
        const username = addModal.dataset.username;
        const currentLocal = parseInt(addModal.dataset.currentLocal, 10);
        const currentGlobal = parseInt(addModal.dataset.currentGlobal, 10);
        const localToAdd = parseInt(addModalLocalInput.value, 10);
        const globalToAdd = parseInt(addModalGlobalInput.value, 10);
        const reason = addModalReasonInput.value.trim();

        if (isNaN(localToAdd) || isNaN(globalToAdd) || localToAdd < 0 || globalToAdd < 0) {
            alert('Please enter valid, non-negative numbers for points.');
            return;
        }
        if (!reason) { alert('Please provide a reason.'); return; }
        if (localToAdd === 0 && globalToAdd === 0) { alert('Please add at least one point.'); return; }

        const newLocalTotal = currentLocal + localToAdd;
        const newGlobalTotal = currentGlobal + globalToAdd;

        sendUpdateRequest(username, reason, newLocalTotal, newGlobalTotal, addModalSubmitButton, 'Add');
    });

    // 4. Handle REDEEMING Points (Modal Submission)
    redeemModalSubmitButton.addEventListener('click', () => {
        const username = redeemModal.dataset.username;
        const currentLocal = parseInt(redeemModal.dataset.currentLocal, 10);
        const currentGlobal = parseInt(redeemModal.dataset.currentGlobal, 10);
        const localToRedeem = parseInt(redeemModalLocalInput.value, 10);
        const globalToRedeem = parseInt(redeemModalGlobalInput.value, 10);
        const reason = redeemModalReasonInput.value.trim();

        if (isNaN(localToRedeem) || isNaN(globalToRedeem) || localToRedeem < 0 || globalToRedeem < 0) {
            alert('Please enter valid, non-negative numbers for points.');
            return;
        }
        if (!reason) { alert('Please provide a reason.'); return; }
        if (localToRedeem === 0 && globalToRedeem === 0) { alert('Please redeem at least one point.'); return; }

        if (localToRedeem > currentLocal || globalToRedeem > currentGlobal) {
            alert(`Update failed. User does not have enough points. Current points - Local: ${currentLocal}, Global: ${currentGlobal}`);
            return;
        }

        const newLocalTotal = currentLocal - localToRedeem;
        const newGlobalTotal = currentGlobal - globalToRedeem;

        sendUpdateRequest(username, reason, newLocalTotal, newGlobalTotal, redeemModalSubmitButton, 'Redeem');
    });

    // 5. Generic API Update Function
    function sendUpdateRequest(username, reason, newLocal, newGlobal, submitButton, actionText) {
        submitButton.disabled = true;
        submitButton.textContent = 'Processing...';

        const requestData = {
            password: currentPassword,
            updated_by: loggedInUser,
            user_affected: username,
            reason: reason,
            new_local: newLocal,
            new_global: newGlobal
        };

        fetch(APP_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(requestData),
            cache: 'no-store',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        })
        .then(response => response.json())
        .then(result => {
            if (result.status === 'success') {
                const userToUpdate = usersData.find(u => u.username === username);
                if (userToUpdate) {
                    userToUpdate.current_local_points = newLocal;
                    userToUpdate.current_global_points = newGlobal;
                }

                displayUsers(usersData);

                addModal.style.display = 'none';
                redeemModal.style.display = 'none';

            } else {
                throw new Error(result.message);
            }
        })
        .catch(error => {
            console.error('Update failed:', error);
            alert('Update failed: ' + error.message);
        })
        .finally(() => {
            submitButton.disabled = false;
            submitButton.textContent = actionText;
        });
    }

    // 6. Handle Modal Closing
    [addModal, redeemModal].forEach(modal => {
        const closeButton = modal.querySelector('.close-button');
        closeButton.addEventListener('click', () => { modal.style.display = 'none'; });
        window.addEventListener('click', (event) => {
            if (event.target == modal) { modal.style.display = 'none'; }
        });
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
                <div class="user-info">
                    <h3>${user.username}</h3>
                    <p>Local: ${user.current_local_points || 0}, Global: ${user.current_global_points || 0}</p>
                    <p><strong>Total: ${totalPoints}</strong></p>
                </div>
                <div class="button-group">
                    <button class="add-points-button">Add</button>
                    <button class="redeem-points-button">Redeem</button>
                </div>
            `;
            userCardsContainer.appendChild(card);
        });
    }
});
