chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    if (request.action === 'ping') {

        sendResponse({ status: 'ok' });
        return true;
        
    }

    if (request.action === 'getPageContent') {

        try {
            const textContent = document.body.innerText;

            const cleanedText = textContent
                .replace(/\s+/g, ' ')
                .replace(/\n+/g, ' ')
                .trim();

            sendResponse({ text: cleanedText });

        } catch (error) {

            console.error('error extracting page content:', error);
            sendResponse({ error: 'failed to extract page content' });

        }

    }

    return true;

});
