chrome.runtime.onInstalled.addListener(() => {

    chrome.contextMenus.create({

        id: 'generateQuizPage',
        title: 'Generate Quiz from Page',
        contexts: ['page']

    });

    chrome.storage.sync.get('quizSettings', (data) => {

        if (!data.quizSettings) {

            const defaultSettings = {

                questionCount: 1,
                mcq: true,
                tof: true,
                saq: true,
                difficulty: 'medium',
                apiKey: ''

            };

            chrome.storage.sync.set({ quizSettings: defaultSettings });

        }

    });

});

chrome.contextMenus.onClicked.addListener((info, tab) => {

    if (info.menuItemId === 'generateQuizPage') {

        chrome.tabs.sendMessage(tab.id, { action: 'getPageContent' }, (response) => {

            if (response && response.text) {

                generateQuiz(response.text, tab.url);

            }

        });

    }

});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    if (request.action === 'generateQuiz') {

        generateQuiz(request.text, sender.tab?.id, request.options)
            .then(() => sendResponse({ status: 'processing' }))
            .catch(error => {

                console.error('Quiz generation error:', error);

                chrome.runtime.sendMessage({

                    action: 'quizGenerationFailed',
                    error: error.message

                });

            });
        return true;
    }

    else if (request.action === 'getSettings') {

        chrome.storage.sync.get('quizSettings', (data) => {

            sendResponse({ settings: data.quizSettings });

        });

        return true;
    }

    else if (request.action === 'updateSettings') {

        chrome.storage.sync.set({ quizSettings: request.settings }, () => {

            sendResponse({ status: 'success' });

        });

        return true;
    }

    else if (request.action === 'contentScriptLoaded' ||
        request.action === 'googleDocsScriptLoaded') {

        sendResponse({ status: 'acknowledged' });

    }

    else if (request.action === 'generateExplanation') {

        const { question, answer, correctAnswer, apiKey } = request;

        generateExplanationWithGemini(question, answer, correctAnswer, apiKey)
            .then(explanation => sendResponse({ explanation }))
            .catch(err => {

                console.error(err);
                sendResponse({ error: err.message });

            });

        return true;

    } else if (request.action == 'textAnswerCheck') {

        const { question, userAnswer, correctAnswer } = request;

        chrome.storage.sync.get('quizSettings', async (data) => {
            const apiKey = data.quizSettings?.apiKey;

            if (!apiKey) {

                sendResponse({ error: 'API key not found' });
                return;

            }

            try {

                const isCorrect = await checkTextAnswerWithGemini(

                    question,
                    userAnswer,
                    correctAnswer,
                    apiKey

                );

                sendResponse({ isCorrect });

            } catch (error) {

                console.error('Error checking short answer:', error);
                sendResponse({ error: error.message });

            }

        });

        return true;

    }

    else if (request.action === 'generateExplanations') {

        const { questions } = request;

        chrome.storage.sync.get('quizSettings', async (data) => {

            const apiKey = data.quizSettings?.apiKey;

            if (!apiKey) {

                sendResponse({ error: 'API key not found' });
                return;

            }

            try {

                const explanations = await Promise.all(

                    questions.map(async (q, index) => {

                        const explanation = await generateExplanationWithGemini(
                            q.question,
                            q.answer,
                            q.correctAnswer,
                            apiKey

                        );

                        return { index, explanation };
                    })

                );

                sendResponse({ explanations });

            } catch (err) {

                console.error('Bulk explanation generation failed:', err);
                sendResponse({ error: err.message });

            }

        });

        return true;
    }

});

async function checkTextAnswerWithGemini(question, userAnswer, correctAnswer, apiKey) {

    if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {

        console.error('[Gemini Answer Check] Missing or invalid API key:', apiKey);
        throw new Error('Missing or invalid API key');

    }

    const prompt = `
    You are an AI grader. Be lenient with small typos or wording, but strict on factual correctness.

    ONLY reply with a single character:
    - Reply with "1" if the student's answer is acceptable.
    - Reply with "0" if the student's answer is incorrect.
    - NO extra text, formatting, or explanation.

    Question: "${question}"
    Student's Answer: "${userAnswer}"
    Correct Answer: "${correctAnswer}"

    Answer:`.trim();

    async function fetchAndValidate() {

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {

            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({

                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.3 }

            })

        });

        if (!response.ok) {

            const errText = await response.text();
            console.error('[Gemini API Error]', response.status, errText);
            return null;

        }

        const data = await response.json();
        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (!raw) {

            console.warn('[Gemini] Empty or missing output:', data, response);
            return null;

        }

        console.warn('[Gemini Raw Output]:', raw);

        const cleaned = raw.match(/\b[01]\b/)?.[0];

        console.warn('[Gemini Cleaned Result]:', cleaned);

        if (cleaned === "1" || cleaned === "0") {

            return cleaned === "1";

        }

        return null;

    }

    let attempts = 0;
    let result = null;

    while (result === null && attempts < 3) {

        result = await fetchAndValidate();
        attempts++;

    }

    if (result === null) {

        throw new Error('Invalid response from Gemini after 3 attempts');

    }

    return result;

}

async function generateQuiz(text, url, options = {}) {

    try {

        const { quizSettings } = await chrome.storage.sync.get('quizSettings');

        if (!quizSettings) {

            throw new Error('Quiz settings not found');

        }

        const processedText = prepareTextForApi(text);

        if (!processedText) {

            throw new Error('No text content to generate quiz from');

        }

        let quizData;
        if (quizSettings.aiProvider === 'gemini') {

            quizData = await generateQuizWithGemini(processedText, quizSettings);

        } else {

            throw new Error('AI provider not supported');

        }

        await chrome.storage.local.set({ currentQuiz: quizData });

        const quizUrl = chrome.runtime.getURL('src/quiz.html');
        chrome.tabs.create({ url: quizUrl });

    } catch (error) {

        console.error('Quiz generation failed:', error);
        throw error;

    }

}

async function getGoogleAccessToken() {

    return new Promise((resolve, reject) => {

        chrome.identity.getAuthToken({ interactive: true }, token => {

            if (chrome.runtime.lastError || !token) {

                reject(chrome.runtime.lastError || new Error('Token fetch failed'));

            } else {

                resolve(token);

            }

        });

    });

}

function prepareTextForApi(text) {

    if (!text) return '';

    const MAX_LENGTH = 15000;
    return text.length > MAX_LENGTH ? text.substring(0, MAX_LENGTH) : text;

}

function constructPrompt(text, questionCount, questionTypes, difficulty) {

    return `Create an educational quiz based on the following text. 
  
    Text: """
    ${text}
    """
    
    Please generate ${questionCount} questions with the following specifications:
    1. Include these question types: ${questionTypes.join(', ')}
    2. Difficulty level: ${difficulty}
    3. For multiple choice questions, provide 4 options with one correct answer
    4. For all questions, include the correct answer
    5. Format your response as a JSON object with this structure:
    6. ASSUME THE PERSON TAKING THE QUIZ DOES NOT HAVE ACCESS TO THE TEXT. DO NOT MENTION THE TEXT.
    7. NUMBER SIX IS VERY IMPORTANT.
    {
      "title": "Quiz title based on the content",
      "questions": [
        {
          "type": "multiple_choice",
          "question": "Question text",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "answer": "Correct option (full text)",
          "explanation": "Brief explanation of the answer"
        },
        {
          "type": "true_false",
          "question": "True/False question text",
          "answer": true or false,
          "explanation": "Brief explanation of the answer"
        },
        {
          "type": "short_answer",
          "question": "Short answer question text",
          "answer": "Correct answer",
          "explanation": "Brief explanation of the answer"
        }
      ]
    }
    
    Ensure the questions test understanding of the key concepts in the text, not just memorization of facts.`;

}

async function generateQuizWithGemini(text, settings) {

    if (!settings.apiKey) {

        throw new Error('Gemini API key is required');

    }

    const questionTypes = [];
    const qt = settings.questionTypes || {};

    if (qt.multipleChoice) questionTypes.push('multiple choice');
    if (qt.trueFalse) questionTypes.push('true/false');
    if (qt.shortAnswer) questionTypes.push('short answer');


    if (questionTypes.length === 0) {

        throw new Error('At least one question type must be selected');

    }

    const prompt = constructPrompt(text, settings.questionCount, questionTypes, settings.difficulty);

    try {

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${settings.apiKey}`, {

            method: 'POST',
            headers: {

                'Content-Type': 'application/json'

            },

            body: JSON.stringify({

                contents: [
                    {
                        parts: [
                            {
                                text: prompt
                            }
                        ]
                    }
                ],

                generationConfig: {

                    temperature: 0.7

                }
            })
            
        });

        if (!response.ok) {

            const errorData = await response.json();
            throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);

        }

        const data = await response.json();

        if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {

            throw new Error('Invalid response from Gemini API');

        }

        return parseGeminiResponse(data.candidates[0].content.parts[0].text, text);

    } catch (error) {

        console.error('Gemini API error:', error);
        throw new Error(`Failed to generate quiz: ${error.message}`);

    }

}

async function generateExplanationWithGemini(question, answer, correctAnswer, apiKey) {

    const prompt = `
        You are an educational AI tutor. Based on the student's answer, determine whether it is correct or not using string comparison with the correct answer.

        Instructions:
        - If the student's answer matches the correct answer exactly (case-insensitive), explain why it is correct.
        - If it does NOT match, explain why the student's answer is incorrect and guide them to understand the correct answer.
        - DO NOT output both correct and incorrect explanations.
        - Do not include any intro or filler text.
        - Do NOT use bold, italics, or markdown (no **, __, *, etc.) unless the characters are part of the answer.
        - Keep your response plain and focused.
        - DO NOT refer to the student as a student. Use YOU instead ONLY IF NECESSARY.

        Input:
        Question: "${question}"
        Student's Answer: "${answer}"
        Correct Answer: "${correctAnswer}"

    `;

    try {

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {

            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({

                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.5 }

            })

        });

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Explanation not available.';

    } catch (error) {

        console.error('Error generating explanation:', error);
        throw new Error('Failed to generate explanation');

    }

}

function parseGeminiResponse(responseText, sourceText) {

    try {

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {

            throw new Error('Could not extract JSON from API response');

        }

        const quizData = JSON.parse(jsonMatch[0]);

        if (!quizData.title || !Array.isArray(quizData.questions)) {

            throw new Error('Invalid quiz data structure');

        }

        quizData.sourceText = sourceText.substring(0, 200) + '...';
        quizData.timestamp = new Date().toISOString();

        return quizData;

    } catch (error) {

        console.error('Error parsing Gemini response:', error);
        throw new Error('Failed to parse quiz data from API response');

    }

}