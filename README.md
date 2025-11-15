# QuizFire — AI-Powered Quiz Generation Chrome Extension

QuizFire is a Chrome extension that automatically generates quizzes from a webpage using the **Gemini API**. It supports multiple question types — multiple choice, true/false, and short answer — and can generate explanations after submission.

---

## How to Install QuizFire 
Because QuizFire is not in the Chrome Web Store yet, you must install it manually:

1. Download or clone the **QuizFire** project folder.
2. Open Chrome → navigate to `chrome://extensions/`.
3. Enable **Developer Mode** (top-right toggle).
4. Click **Load unpacked**.
5. Select the QuizFire project folder.

If installed correctly, the extension icon will appear in your Chrome toolbar.

---

## API Keys

### Gemini API Key
- You must provide **your own Gemini API key**.
- Your key is *never* stored on any external server — it stays inside `chrome.storage.sync` and is only accessible from your browser.
- Without a valid API key, QuizFire **cannot** generate quiz questions or explanations.

### Setting Up Your API Key
1. Create or log in to your Google AI Studio account.  
   **Link:** https://aistudio.google.com/app/apikey
2. Copy your newly generated API key.
3. Open the QuizFire extension → go to **Settings**.
4. Paste your key into the **API Key** field.
5. Click **Save** — QuizFire will validate your key automatically.

---

## Generating a Quiz

### From Any Webpage:
1. Open the webpage or article you want to convert.
2. Click the QuizFire extension icon.
3. Adjust your quiz settings:
   - Number of questions  
   - Difficulty  
   - Question types  
   - Timer settings  
4. Click **Generate Quiz**.

QuizFire will analyze the webpage content, summarize key points, and build a custom quiz using the Gemini API.

---

## 📄 Google Docs Support
> **Important:**  
> Direct Google Docs integration is **not supported** due to Chrome extension permission restrictions.  
> QuizFire currently **cannot** read content from private Google Docs automatically.

Future versions *may* support this once new APIs or OAuth support is added.

---

## Taking the Quiz
- Move between questions using **Next** and **Back**.
- When finished, click **Submit**.
- QuizFire will generate AI explanations **after submission**, not during the question phase.
- You can review:
  - Correct answers  
  - AI explanations  
  - Your score  
  - Summary breakdown  

---

## Exporting Results
QuizFire currently supports:
- **PDF export** for printing or studying offline

More export formats will be added in future updates.

---

## Tech Stack
- **Manifest V3**
- **Chrome Storage (sync + local)**
- **Gemini 2.0 Flash API**
- **HTML, CSS, JavaScript**
- **Modular background/service worker architecture**

---
