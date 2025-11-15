document.addEventListener('DOMContentLoaded', () => {

    let quizData = null;
    let currentQuestionIndex = 0;
    let userAnswers = [];
    let quizStarted = false;
    let quizCompleted = false;
    let timerInterval = null;
    let timeRemaining = 0;

    const quizTitle = document.getElementById('quiz-title');
    const questionCount = document.getElementById('question-count');
    const difficultyElement = document.getElementById('difficulty');
    const loadingContainer = document.getElementById('loading');
    const quizContent = document.getElementById('quiz-content');
    const quizIntro = document.getElementById('quiz-intro');
    const startQuizBtn = document.getElementById('start-quiz-btn');
    const questionsContainer = document.getElementById('questions-container');
    const progressBar = document.getElementById('progress-bar');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const resultsContainer = document.getElementById('results-container');
    const resultsBreakdown = document.getElementById('results-breakdown');
    const errorContainer = document.getElementById('error-container');
    const retryBtn = document.getElementById('retry-btn');
    const timerContainer = document.getElementById('timer-container');
    const timerDisplay = document.getElementById('timer-display');
    const questionList = document.getElementById('question-list');
    const questionsNav = document.getElementById('questions-nav');
    const summaryScore = document.getElementById('summary-score');
    const summaryCorrect = document.getElementById('summary-correct');
    const summaryIncorrect = document.getElementById('summary-incorrect');
    const summaryTime = document.getElementById('summary-time');
    const restartFromSummary = document.getElementById('restart-from-summary');
    const exportFromSummary = document.getElementById('export-from-summary');

    const multipleChoiceTemplate = document.getElementById('multiple-choice-template');
    const trueFalseTemplate = document.getElementById('true-false-template');
    const shortAnswerTemplate = document.getElementById('short-answer-template');
    const resultItemTemplate = document.getElementById('result-item-template');

    initializeQuiz();

    startQuizBtn.addEventListener('click', startQuiz);

    prevBtn.addEventListener('click', () => {

        if (currentQuestionIndex > 0) {

            goToQuestion(currentQuestionIndex - 1);

        }

    });

    nextBtn.addEventListener('click', () => {

        if (currentQuestionIndex < quizData.questions.length - 1) {

            goToQuestion(currentQuestionIndex + 1);

        }

    });

    restartFromSummary.addEventListener('click', restartQuiz);
    exportFromSummary.addEventListener('click', exportAsPdf);
    retryBtn.addEventListener('click', initializeQuiz);

    window.addEventListener('quizSettingsChanged', (event) => {

        const settings = event.detail;
        updateQuizSettings(settings);

    });

    function initializeQuiz() {

        currentQuestionIndex = 0;
        userAnswers = [];
        quizStarted = false;
        quizCompleted = false;

        loadingContainer.classList.remove('hidden');
        quizContent.classList.add('hidden');
        errorContainer.classList.add('hidden');
        questionsNav.classList.add('hidden');
        document.querySelector('.progress-section').classList.add('hidden');
        document.getElementById('results-summary').classList.add('hidden');

        const settings = JSON.parse(localStorage.getItem('quizSettings')) || getDefaultSettings();
        window.quizSettings = settings;

        chrome.storage.local.get('currentQuiz', (data) => {

            if (chrome.runtime.lastError) {

                showError('Error loading quiz data: ' + chrome.runtime.lastError.message);
                return;

            }

            if (!data.currentQuiz) {

                showError('No quiz data found. Please generate a new quiz.');
                return;
            }

            quizData = data.currentQuiz;

            if (quizData.questions.length > settings.questionCount) {

                quizData.questions = quizData.questions.slice(0, settings.questionCount);

            }

            userAnswers = new Array(quizData.questions.length).fill(null);

            questionList.innerHTML = '';

            quizData.questions.forEach((_, index) => {

                const questionNumber = document.createElement('div');
                questionNumber.className = 'question-number';
                questionNumber.textContent = index + 1;
                questionNumber.addEventListener('click', () => {

                    goToQuestion(index);

                });
                questionList.appendChild(questionNumber);

            });

            quizTitle.textContent = quizData.title;
            questionCount.textContent = `${quizData.questions.length} questions`;

            const difficulty = settings.difficulty || 'Medium';
            difficultyElement.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

            loadingContainer.classList.add('hidden');
            quizContent.classList.remove('hidden');
            quizIntro.classList.remove('hidden');
            questionsContainer.classList.add('hidden');
            resultsContainer.classList.add('hidden');

            updateNavButtons();

        });

    }

    function startQuiz() {

        const settings = JSON.parse(localStorage.getItem('quizSettings')) || getDefaultSettings();
        window.quizSettings = settings;
        
        quizStarted = true;
        
        document.getElementById('quiz-intro').classList.add('hidden');
        document.getElementById('questions-container').classList.remove('hidden');
        questionsNav.classList.remove('hidden');
        document.querySelector('.progress-section').classList.remove('hidden');
        
        if (settings.timerEnabled) {

            const timerContainer = document.getElementById('timer-container');
            timerContainer.classList.remove('hidden');
            startTimer(settings.timerDuration);

        }

        console.log("Timer enabled?", settings.timerEnabled);
        console.log("Timer duration?", settings.timerDuration);
        
        goToQuestion(0);

    }

    function startTimer(duration) {

        if (timerInterval) {

            clearInterval(timerInterval);

        }

        timeRemaining = duration;
        updateTimerDisplay();

        timerInterval = setInterval(() => {

            timeRemaining--;
            updateTimerDisplay();

            if (timeRemaining <= 0) {

                clearInterval(timerInterval);
                completeQuiz();

            }

        }, 1000);

    }

    function updateTimerDisplay() {

        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        timerDisplay.classList.remove('warning', 'danger');

        if (timeRemaining <= 30) {

            timerDisplay.classList.add('danger');

        } else if (timeRemaining <= 60) {

            timerDisplay.classList.add('warning');

        }

    }

    function showQuestion(index) {

        if (!quizData || !quizData.questions[index]) return;

        const questionDisplay = document.getElementById('question-display');
        const currentQuestion = quizData.questions[index];
        
        document.querySelectorAll('.question-number').forEach((el, i) => {

            el.classList.remove('current');

            if (i === index) {

                el.classList.add('current');

            }
            if (userAnswers[i]) {

                el.classList.add('answered');

                if (userAnswers[i].isCorrect) {

                    el.classList.add('correct');
                    el.classList.remove('incorrect');

                } else {

                    el.classList.add('incorrect');
                    el.classList.remove('correct');

                }

            } else {

                el.classList.remove('answered', 'correct', 'incorrect');

            }

        });

        let questionElement;

        if (currentQuestion.type === 'multiple_choice') {

            questionElement = createMultipleChoiceQuestion(currentQuestion, index);

        } else if (currentQuestion.type === 'true_false') {

            questionElement = createTrueFalseQuestion(currentQuestion, index);

        } else if (currentQuestion.type === 'short_answer') {

            questionElement = createShortAnswerQuestion(currentQuestion, index);

        }

        questionDisplay.innerHTML = '';
        questionDisplay.appendChild(questionElement);

        if (userAnswers[index] !== null) {

            const options = questionDisplay.querySelectorAll('.option');

            options.forEach(option => {

                if (option.textContent === userAnswers[index].selected) {

                    option.classList.add('selected');

                }
                if (option.textContent === currentQuestion.answer) {

                    option.classList.add('correct-answer');

                }
                if (option.textContent === userAnswers[index].selected && !userAnswers[index].isCorrect) {

                    option.classList.add('incorrect');

                }

            });

        }

        updateNavButtons();
        updateProgress();

    }

    function goToQuestion(index) {

        if (!quizStarted) return;
        
        if (index >= 0 && index < quizData.questions.length) {

            currentQuestionIndex = index;
            showQuestion(index);

        }

    }

    function updateProgress() {

        const progress = (currentQuestionIndex + 1) / quizData.questions.length * 100;
        progressBar.style.width = `${progress}%`;

    }

    function createMultipleChoiceQuestion(question, index) {

        const template = multipleChoiceTemplate.content.cloneNode(true);
        const questionText = template.querySelector('.question-text');
        const optionsContainer = template.querySelector('.options-container');
        const explanation = template.querySelector('.explanation');
        const explanationText = template.querySelector('.explanation-text');

        questionText.textContent = `${index + 1}. ${question.question}`;

        question.options.forEach((option) => {

            const optionElement = document.createElement('div');
            optionElement.className = 'option';
            optionElement.addEventListener('click', () => selectAnswer(index, option));

            if (userAnswers[index] !== null) {

                if (userAnswers[index].selected === option) {

                    optionElement.classList.add('selected');
                }

            }

            optionElement.textContent = option;
            optionsContainer.appendChild(optionElement);

        });

        if (quizCompleted && question.explanation) {

            explanation.classList.remove('hidden');
            explanationText.textContent = question.explanation;

        }

        return template;

    }

    function createTrueFalseQuestion(question, index) {

        const template = trueFalseTemplate.content.cloneNode(true);
        const questionText = template.querySelector('.question-text');
        const optionsContainer = template.querySelector('.options-container');
        const explanation = template.querySelector('.explanation');
        const explanationText = template.querySelector('.explanation-text');

        questionText.textContent = `${index + 1}. ${question.question}`;

        ['true', 'false'].forEach((option) => {

            const optionElement = document.createElement('div');
            optionElement.className = 'option';
            optionElement.addEventListener('click', () => selectAnswer(index, option));

            if (userAnswers[index] !== null) {

                if (userAnswers[index].selected === option) {

                    optionElement.classList.add('selected');

                }

            } 

            optionElement.textContent = option;
            optionsContainer.appendChild(optionElement);

        });

        if (quizCompleted && question.explanation) {

            explanation.classList.remove('hidden');
            explanationText.textContent = question.explanation;

        }

        return template;

    }

    function createShortAnswerQuestion(question, index) {

        const template = shortAnswerTemplate.content.cloneNode(true);
        const questionText = template.querySelector('.question-text');
        const answerInput = template.querySelector('.short-answer-input');
        const explanation = template.querySelector('.explanation');
        const explanationText = template.querySelector('.explanation-text');

        questionText.textContent = `${index + 1}. ${question.question}`;

        if (userAnswers[index] !== null) {

            answerInput.value = userAnswers[index].selected;
            answerInput.disabled = true;
            
        } else {

            answerInput.addEventListener('input', () => {

                userAnswers[index] = {

                    selected: answerInput.value,
                    isCorrect: null 

                };

            });

        }

        if (quizCompleted && question.explanation) {

            explanation.classList.remove('hidden');
            explanationText.textContent = question.explanation;

        }

        return template;

    }

    function selectAnswer(questionIndex, answer) {

        const question = quizData.questions[questionIndex];
        const isCorrect = question.type === 'short_answer' 
            ? answer.toLowerCase() === question.answer.toLowerCase()
            : answer === question.answer;
        
        userAnswers[questionIndex] = {

            selected: answer,
            isCorrect: isCorrect

        };
        
        const questionNumber = document.querySelectorAll('.question-number')[questionIndex];

        if (questionNumber) {

            questionNumber.classList.add('answered');

            if (isCorrect) {

                questionNumber.classList.add('correct');
                questionNumber.classList.remove('incorrect');

            } else {

                questionNumber.classList.add('incorrect');
                questionNumber.classList.remove('correct');

            }

        }
        
        const options = document.querySelectorAll('.option');

        options.forEach(option => {

            option.classList.remove('selected');

            if (option.textContent === answer) {

                option.classList.add('selected');

            }
        
        });

        showQuestion(questionIndex);
        
    }

    function updateNavButtons() {

        prevBtn.disabled = currentQuestionIndex  === 0;
        nextBtn.disabled = currentQuestionIndex  === quizData.questions.length - 1;

        if (currentQuestionIndex  === quizData.questions.length - 1) {
        
            nextBtn.classList.add('hidden'); 
        
        } else {
        
            nextBtn.classList.remove('hidden');
            nextBtn.textContent = 'Next';

        }

    }

    async function completeQuiz() {

        if (timerInterval) {

            clearInterval(timerInterval);

        }

        timerContainer.classList.add('hidden');
        document.querySelector('.progress-section').classList.add('hidden');
        
        quizCompleted = true;
        questionsContainer.classList.add('hidden');
        resultsContainer.classList.remove('hidden');
        questionsNav.classList.add('hidden'); 

        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        summaryTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        quizData.questions.forEach((q, index) => {

            if (q.userAnswer == null) {

                q.userAnswer = " "; 

            }

        });

        const aiCheckedAnswers = await Promise.all(

            quizData.questions.map(async (question, index) => {

                const userAnswer = userAnswers[index];

                if (question.type === 'short_answer' && userAnswer?.selected) {

                    const result = await new Promise(resolve => {

                        chrome.runtime.sendMessage(

                            {

                                action: 'textAnswerCheck',
                                question: question.question,
                                userAnswer: userAnswer.selected,
                                correctAnswer: question.answer

                            },
                            (response) => {

                                const isCorrect = response?.isCorrect ?? response?.result ?? false;
                                resolve(isCorrect);

                            }

                        );

                    });

                    return { index, isCorrect: result };

                }

                return { index, isCorrect: userAnswer?.selected === question.answer };

            })

        );

        aiCheckedAnswers.forEach(({ index, isCorrect }) => {

            if (!userAnswers[index]) {

                userAnswers[index] = {

                    selected: '', 
                    
                };

            }

            userAnswers[index].isCorrect = isCorrect;

        });

        const correctAnswers = userAnswers.filter(answer => answer && answer.isCorrect).length;
        const percentage = Math.round((correctAnswers / quizData.questions.length) * 100);
        const incorrectAnswers = quizData.questions.length - correctAnswers;
        
        document.getElementById('results-summary').classList.remove('hidden');
        summaryScore.textContent = `${percentage}%`;
        summaryCorrect.textContent = correctAnswers;
        summaryIncorrect.textContent = incorrectAnswers;
        
        chrome.runtime.sendMessage(
            {

                action: 'generateExplanations',
                questions: quizData.questions.map((q, i) => ({

                    question: q.question,
                    answer: userAnswers[i]?.selected || '',
                    correctAnswer: q.answer

                }))

            },
            (response) => {

                if (response && response.explanations) {

                    response.explanations.forEach(({ index, explanation }) => {

                        if (quizData.questions[index]) {

                            quizData.questions[index].explanation = explanation;

                        }

                    });

                    chrome.storage.local.set({ currentQuiz: quizData });
                    showQuestion(currentQuestionIndex);
                } else {

                    console.error("Explanation generation failed:", response?.error || 'unknown error');

                }

            }

        );

        generateResultsBreakdown();

    }

    function generateResultsBreakdown() {

        const resultsBreakdown = document.getElementById('results-breakdown');
        resultsBreakdown.innerHTML = '';
        
        quizData.questions.forEach((question, index) => {

            const resultItem = resultItemTemplate.content.cloneNode(true);
            const questionNumber = resultItem.querySelector('.question-number');
            const resultStatus = resultItem.querySelector('.result-status');
            const questionText = resultItem.querySelector('.question-text');
            const yourAnswer = resultItem.querySelector('.your-answer');
            const correctAnswer = resultItem.querySelector('.correct-answer');
            const explanationText = resultItem.querySelector('.explanation-text');
            
            questionNumber.textContent = `Question ${index + 1}`;
            questionText.textContent = question.question;
            
            const userAnswer = userAnswers[index];
            let isCorrect = false;
            
            if (question.type === 'multiple_choice') {

                yourAnswer.textContent = `Your answer: ${userAnswer.selected || 'Not answered'}`;
                correctAnswer.textContent = `Correct answer: ${question.answer}`;
                isCorrect = userAnswer.isCorrect;

            } else if (question.type === 'true_false') {

                const userAnswerText = userAnswer.selected ? userAnswer.selected.toString().toLowerCase() : 'Not answered';
                const correctAnswerText = question.answer.toString().toLowerCase();
                yourAnswer.textContent = `Your answer: ${userAnswerText}`;
                correctAnswer.textContent = `Correct answer: ${correctAnswerText}`;
                isCorrect = userAnswer.isCorrect;

            } else if (question.type === 'short_answer') {

                yourAnswer.textContent = `Your answer: ${userAnswer.selected || 'Not answered'}`;
                correctAnswer.textContent = `Correct answer: ${question.answer}`;
                isCorrect = userAnswer.isCorrect;

            }
            
            resultStatus.textContent = isCorrect ? 'Correct' : 'Incorrect';
            resultStatus.classList.add(isCorrect ? 'correct' : 'incorrect');
            yourAnswer.classList.add(isCorrect ? 'correct' : 'incorrect');
            
            if (question.explanation) {

                explanationText.textContent = question.explanation;

            } else {

                explanationText.textContent = 'No explanation available.';

            }

            resultsBreakdown.appendChild(resultItem);

        });

    }

    function restartQuiz() {

        if (timerInterval) {

            clearInterval(timerInterval);
            timerInterval = null;

        }

        timerContainer.classList.remove('hidden');
        document.getElementById('timer-display').textContent = '00:00';
        document.querySelector('.progress-section').classList.remove('hidden');
        resultsContainer.classList.add('hidden');
        document.getElementById('results-summary').classList.add('hidden');
        questionsNav.classList.remove('hidden');
        questionsContainer.classList.remove('hidden');
        document.getElementById('submit-quiz').disabled = false;
        document.getElementById('progress-bar').style.width = '0%';

        currentQuestionIndex = 0;
        userAnswers = new Array(quizData.questions.length).fill(null);
        quizCompleted = false;
        quizStarted = true;

        document.querySelectorAll('.question-number').forEach(el => {

            el.classList.remove('answered');

        });


        document.querySelectorAll('.explanation').forEach(el => {

            el.classList.add('hidden');
            el.querySelector('.explanation-text').textContent = '';

        });

        document.querySelectorAll('.selected').forEach(el => {

            el.classList.remove('selected');

        });

        document.getElementById('question-list').innerHTML = '';

        quizData.questions.forEach((_, index) => {

            const el = document.createElement('div');
            el.className = 'question-number';
            el.textContent = index + 1;

            el.addEventListener('click', () => {

                goToQuestion(index);

            });

            document.getElementById('question-list').appendChild(el);

        });

        goToQuestion(0);

        if (window.quizSettings.timerEnabled) {

            startTimer(window.quizSettings.timerDuration);

        }

    }

    function exportAsPdf() {

        const printWindow = window.open('', '_blank');

        let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${quizData.title} - Results</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
                .header { text-align: center; margin-bottom: 20px; }
                .summary { margin-bottom: 30px; }
                .summary-item { margin: 10px 0; }
                .question { margin-bottom: 20px; page-break-inside: avoid; }
                .answer { margin-top: 10px; }
                .correct { color: #2f855a; }
                .incorrect { color: #c53030; }
                .explanation { margin-top: 10px; font-style: italic; }
                @media print {
                    body { font-size: 12pt; }
                    .page-break { page-break-after: always; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${quizData.title}</h1>
                <div class="summary">
                    <div class="summary-item">Score: ${Math.round((userAnswers.filter(a => a && a.isCorrect).length / quizData.questions.length) * 100)}%</div>
                    <div class="summary-item">Correct Answers: ${userAnswers.filter(a => a && a.isCorrect).length}</div>
                    <div class="summary-item">Incorrect Answers: ${userAnswers.filter(a => a && !a.isCorrect).length}</div>
                </div>
            </div>
        `;

        quizData.questions.forEach((question, index) => {

            const userAnswer = userAnswers[index];
            htmlContent += `
            <div class="question">
                <h3>${index + 1}. ${question.question}</h3>
                <div class="answer ${userAnswer.isCorrect ? 'correct' : 'incorrect'}">
                    Your answer: ${userAnswer.selected || 'Not answered'}<br>
                    Correct answer: ${question.answer}
                </div>
            </div>
            `;

            if ((index + 1) % 3 === 0 && index < quizData.questions.length - 1) {

                htmlContent += `<div class="page-break"></div>`;

            }

        });

        htmlContent += `</body></html>`;

        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();

        setTimeout(() => {

            printWindow.print();

        }, 500);

    }

    function updateQuizSettings(settings) {

        const questionCountElement = document.getElementById('question-count');

        if (questionCountElement) {

            questionCountElement.textContent = `${settings.questionCount} questions`;

        }

        const difficultyElement = document.getElementById('difficulty');

        if (difficultyElement) {

            difficultyElement.textContent = settings.difficulty.charAt(0).toUpperCase() + settings.difficulty.slice(1);
        
        }

        const timerContainer = document.getElementById('timer-container');

        if (timerContainer) {

            if (settings.timerEnabled) {

                timerContainer.classList.remove('hidden');
                const timerDuration = settings.timerDuration * 60; 
                startTimer(timerDuration);

            } else {

                timerContainer.classList.add('hidden');
                stopTimer();

            }

        }

        window.quizSettings = settings;

    }

    function stopTimer() {

        if (timerInterval) {

            clearInterval(timerInterval);

        }

    }

    function getDefaultSettings() {

        return {

            questionCount: 10,
            difficulty: 'Medium',
            timerEnabled: false,
            timerDuration: 120

        };

    }

    document.getElementById('submit-quiz').addEventListener('click', () => {

        const allAnswered = userAnswers.every(answer => answer !== null);
        if (allAnswered) {

            completeQuiz();

        } else {

            const unansweredQuestions = userAnswers
                .map((answer, index) => answer === null ? index + 1 : null)
                .filter(index => index !== null);
            
            alert(`Please answer all questions before submitting. Unanswered questions: ${unansweredQuestions.join(', ')}`);
        
        }

    });

});
