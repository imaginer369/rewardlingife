document.addEventListener('DOMContentLoaded', () => {
    const passwordContainer = document.getElementById('password-container');
    const dashboardContainer = document.getElementById('dashboard-container');
    const passwordInput = document.getElementById('password-input');
    const submitButton = document.getElementById('submit-password');
    const errorMessage = document.getElementById('error-message');
    const userCardsContainer = document.getElementById('user-cards-container');

    submitButton.addEventListener('click', () => {
        const password = passwordInput.value;
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
                        displayUsers(data.users);
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

    function displayUsers(users) {
        userCardsContainer.innerHTML = ''; // Clear previous user cards
        users.forEach(user => {
            const card = document.createElement('div');
            card.className = 'user-card';
            card.innerHTML = `
                <i class="${user.icon}"></i>
                <h3>${user.name}</h3>
                <p>Total Rewards: ${user.rewards}</p>
                <p>Local: ${user.local_rewards}</p>
                <p>Global: ${user.global_rewards}</p>
            `;
            userCardsContainer.appendChild(card);
        });
    }
});