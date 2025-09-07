document.addEventListener('DOMContentLoaded', () => {
    const passwordContainer = document.getElementById('password-container');
    const dashboardContainer = document.getElementById('dashboard-container');
    const passwordInput = document.getElementById('password-input');
    const submitButton = document.getElementById('submit-password');
    const errorMessage = document.getElementById('error-message');
    const userCardsContainer = document.getElementById('user-cards-container');

    let loggedInIcon = null;
    let usersData = null;

    submitButton.addEventListener('click', () => {
        const password = passwordInput.value;
        loggedInIcon = document.querySelector('input[name="icon"]:checked').value;

        if (!password) {
            errorMessage.textContent = 'Please enter a password.';
            return;
        }

        fetch('db.json.enc')
            .then(response => response.text())
            .then(encryptedData => {
                try {
                    const decryptedBytes = CryptoJS.AES.decrypt(encryptedData, password);
                    const decryptedJson = decryptedBytes.toString(CryptoJS.enc.Utf8);

                    if (!decryptedJson) {
                        throw new Error("Invalid password or corrupted data.");
                    }

                    const data = JSON.parse(decryptedJson);

                    if (data.__verification_key__ === 'A_SECRET_STRING_THAT_PROVES_DECRYPTION_WORKED') {
                        errorMessage.textContent = '';
                        passwordContainer.classList.add('hidden');
                        dashboardContainer.classList.remove('hidden');
                        usersData = data.users;
                        displayUsers(usersData);
                    } else {
                        throw new Error("Verification failed. Incorrect password.");
                    }

                } catch (e) {
                    console.error(e);
                    errorMessage.textContent = "Incorrect password. Please try again.";
                }
            })
            .catch(error => {
                console.error('Error fetching the database file:', error);
                errorMessage.textContent = 'Could not load the database file.';
            });
    });

    userCardsContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('update-button')) {
            const userCard = event.target.closest('.user-card');
            const username = userCard.dataset.username;
            const user = usersData.find(u => u.name === username);

            const localInput = userCard.querySelector('.local-points-input');
            const globalInput = userCard.querySelector('.global-points-input');

            const newLocal = parseInt(localInput.value, 10);
            const newGlobal = parseInt(globalInput.value, 10);

            if (user && !isNaN(newLocal) && !isNaN(newGlobal)) {
                user.local_rewards = newLocal;
                user.global_rewards = newGlobal;
                user.rewards = user.local_rewards + user.global_rewards; 

                const logMessage = `[${new Date().toISOString()}] User with '${loggedInIcon}' icon updated points for ${username}: Local -> ${newLocal}, Global -> ${newGlobal}\n`;
                
                // This is a simplified logging mechanism for the browser environment.
                // In a real application, you would send this to a server.
                console.log("Logging update: ", logMessage);
                // Here we would ideally append to a file, but we'll simulate it.

                displayUsers(usersData);
            }
        }
    });

    function displayUsers(users) {
        userCardsContainer.innerHTML = '';
        users.forEach(user => {
            const card = document.createElement('div');
            card.className = 'user-card';
            card.dataset.username = user.name;
            card.innerHTML = `
                <i class="${user.icon}"></i>
                <h3>${user.name}</h3>
                <p>Total Rewards: ${user.rewards}</p>
                <div class="update-container">
                    <label>Local:</label>
                    <input type="number" class="local-points-input" value="${user.local_rewards}">
                </div>
                <div class="update-container">
                    <label>Global:</label>
                    <input type="number" class="global-points-input" value="${user.global_rewards}">
                </div>
                <button class="update-button">Update</button>
            `;
            userCardsContainer.appendChild(card);
        });
    }
});