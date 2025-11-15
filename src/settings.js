document.addEventListener('DOMContentLoaded', () => {

    const aiProviderSelect = document.getElementById('ai-provider');
    const apiKeyInput = document.getElementById('api-key');
    const toggleApiKeyBtn = document.getElementById('toggle-api-key');
    const questionCountInput = document.getElementById('question-count');
    const difficultySelect = document.getElementById('difficulty');
    const timerEnabledCheckbox = document.getElementById('timer-enabled');
    const timerSettings = document.getElementById('timer-settings');
    const timerDurationInput = document.getElementById('timer-duration');
    const multipleChoiceCheckbox = document.getElementById('multiple-choice');
    const trueFalseCheckbox = document.getElementById('true-false');
    const shortAnswerCheckbox = document.getElementById('short-answer');
    const includeExplanationsCheckbox = document.getElementById('include-explanations');
    const resetDefaultsBtn = document.getElementById('reset-defaults');
    const saveSettingsBtn = document.getElementById('save-settings');
    const statusMessage = document.getElementById('status-message');

    loadSettings();

    toggleApiKeyBtn.addEventListener('click', toggleApiKeyVisibility);
    resetDefaultsBtn.addEventListener('click', resetSettings);
    saveSettingsBtn.addEventListener('click', saveSettings);
    aiProviderSelect.addEventListener('change', updateApiKeyPlaceholder);

    timerEnabledCheckbox.addEventListener('change', () => {

        timerSettings.classList.toggle('hidden', !timerEnabledCheckbox.checked);

    });

    function loadSettings() {

        chrome.storage.sync.get('quizSettings', (data) => {

            const savedSettings = data.quizSettings || getDefaultSettings();
            
            aiProviderSelect.value = savedSettings.aiProvider;
            apiKeyInput.value = savedSettings.apiKey;
            questionCountInput.value = savedSettings.questionCount;
            difficultySelect.value = savedSettings.difficulty;
            timerEnabledCheckbox.checked = savedSettings.timerEnabled;
            timerDurationInput.value = savedSettings.timerDuration;
            multipleChoiceCheckbox.checked = savedSettings.questionTypes.multipleChoice;
            trueFalseCheckbox.checked = savedSettings.questionTypes.trueFalse;
            shortAnswerCheckbox.checked = savedSettings.questionTypes.shortAnswer;
            includeExplanationsCheckbox.checked = savedSettings.includeExplanations;

            timerSettings.classList.toggle('hidden', !savedSettings.timerEnabled);

            updateApiKeyPlaceholder();

        });

    }

    function saveSettings() {

        if (!validateSettings()) {

            return;

        }

        const settings = {

            aiProvider: aiProviderSelect.value,
            apiKey: apiKeyInput.value,
            questionCount: parseInt(questionCountInput.value),
            difficulty: difficultySelect.value,
            timerEnabled: timerEnabledCheckbox.checked,
            timerDuration: parseInt(timerDurationInput.value),

            questionTypes: {

                multipleChoice: multipleChoiceCheckbox.checked,
                trueFalse: trueFalseCheckbox.checked,
                shortAnswer: shortAnswerCheckbox.checked

            },

            includeExplanations: includeExplanationsCheckbox.checked,

        };

        chrome.storage.sync.set({ quizSettings: settings }, () => {

            showStatus('Settings saved successfully!', 'success');
            localStorage.setItem('quizSettings', JSON.stringify(settings)); 
            window.dispatchEvent(new CustomEvent('quizSettingsChanged', { detail: settings }));

        });

    }

    function resetSettings() {

        if (confirm('Are you sure you want to reset all settings to default values? This will clear your API key.')) {

            chrome.storage.sync.clear(() => {
                const defaultSettings = getDefaultSettings();
                aiProviderSelect.value = defaultSettings.aiProvider;
                apiKeyInput.value = ''; 
                questionCountInput.value = defaultSettings.questionCount;
                difficultySelect.value = defaultSettings.difficulty;
                timerEnabledCheckbox.checked = defaultSettings.timerEnabled;
                timerDurationInput.value = defaultSettings.timerDuration;
                multipleChoiceCheckbox.checked = defaultSettings.questionTypes.multipleChoice;
                trueFalseCheckbox.checked = defaultSettings.questionTypes.trueFalse;
                shortAnswerCheckbox.checked = defaultSettings.questionTypes.shortAnswer;
                includeExplanationsCheckbox.checked = defaultSettings.includeExplanations;

                timerSettings.classList.toggle('hidden', !defaultSettings.timerEnabled);
                updateApiKeyPlaceholder();

                chrome.storage.sync.set({ quizSettings: defaultSettings }, () => {

                    window.dispatchEvent(new CustomEvent('quizSettingsChanged', { detail: defaultSettings }));
                    showStatus('Settings reset to defaults', 'success');

                });

            });

        }

    }

    function getDefaultSettings() {

        return {

            aiProvider: 'openai',
            apiKey: '',
            questionCount: 10,
            difficulty: 'medium',
            timerEnabled: false,
            timerDuration: 10,

            questionTypes: {

                multipleChoice: true,
                trueFalse: true,
                shortAnswer: true

            },

            includeExplanations: true,

        };

    }

    function toggleApiKeyVisibility() {

        const type = apiKeyInput.type === 'password' ? 'text' : 'password';
        apiKeyInput.type = type;
        toggleApiKeyBtn.textContent = type === 'password' ? 'Show' : 'Hide';

    }

    function updateApiKeyPlaceholder() {

        if (aiProviderSelect.value === 'gemini') {

            apiKeyInput.placeholder = 'Enter your Google Gemini API key';

        }

    }

    function showStatus(message, type = 'success') {

        const statusMessage = document.getElementById('status-message');
        const messageText = statusMessage.querySelector('.message-text');
        const closeBtn = statusMessage.querySelector('.close-btn');
        
        messageText.textContent = message;
        statusMessage.className = type;
        statusMessage.classList.add('visible');
        
        closeBtn.style.display = 'flex';
        
        if (type === 'success') {

            setTimeout(() => {

                statusMessage.classList.remove('visible');

            }, 3000);

        }

    }

    function validateSettings() {

        if (!apiKeyInput.value.trim()) {

            showStatus('Please enter an API key', 'error');
            return false;

        }

        return true;

    }

    saveSettingsBtn.addEventListener('click', (e) => {

        if (!validateSettings()) {

            e.preventDefault();

        }

    });

    if (timerEnabledCheckbox) {

        timerEnabledCheckbox.addEventListener('change', () => {

            const timerSettings = document.querySelector('.timer-settings');

            if (timerSettings) {

                if (timerEnabledCheckbox.checked) {

                    timerSettings.classList.add('visible');

                } else {

                    timerSettings.classList.remove('visible');

                }

            }

        });

    }

    document.querySelector('#status-message .close-btn').addEventListener('click', () => {

        document.getElementById('status-message').classList.remove('visible');

    });

    
});
