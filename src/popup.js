document.addEventListener('DOMContentLoaded', () => {

    const scanPageBtn = document.getElementById('scan-page');
    const openSettingsBtn = document.getElementById('open-settings');
    const loadingContainer = document.querySelector('.loading-container');
    const quizDisplay = document.getElementById('quiz-display');
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');

    checkApiStatus();

    scanPageBtn.addEventListener('click', handleScanPage);
    openSettingsBtn.addEventListener('click', openSettings);

    function checkApiStatus() {

        chrome.storage.sync.get('quizSettings', (data) => {

            const settings = data.quizSettings;

            if (settings && settings.apiKey) {

                statusDot.classList.add('connected');
                statusText.textContent = 'API Key: Connected';

            } else {

                statusDot.classList.add('disconnected');
                statusText.textContent = 'API Key: Not Set';
                scanPageBtn.disabled = true;

            }

        });

    }

    function handleScanPage() {

        loadingContainer.classList.remove('hidden');
        quizDisplay.classList.add('hidden');
        scanPageBtn.disabled = true;

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {

            chrome.tabs.sendMessage(tabs[0].id, { action: 'getPageContent' }, (response) => {

                if (chrome.runtime.lastError) {

                    showError('Error: ' + chrome.runtime.lastError.message);
                    return;

                }

                if (response && response.text) {

                    chrome.runtime.sendMessage({

                        action: 'generateQuiz',
                        text: response.text

                    }, (response) => {

                        if (chrome.runtime.lastError) {

                            showError('Error: ' + chrome.runtime.lastError.message);
                            return;

                        }
                    });

                } else {

                    showError('No content found on this page');

                }

            });

        });

    }

    function openSettings() {

        chrome.runtime.openOptionsPage();

    }

    function showError(message) {

        loadingContainer.classList.add('hidden');
        scanPageBtn.disabled = false;
        statusText.textContent = message;
        statusDot.classList.remove('connected');
        statusDot.classList.add('disconnected');

    }

    chrome.runtime.onMessage.addListener((message) => {

        if (message.action === 'quizGenerationFailed') {

            showError('Error: ' + message.error);

        }
        
    });

});