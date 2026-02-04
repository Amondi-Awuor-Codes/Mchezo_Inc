// ===================================
// QUIZ DATA - Questions & Answers
// ===================================

const quizQuestions = [
    {
        question: "A witness saw a matatu near where Akinyi vanished. They couldn't remember the color. So what did YOU prioritize, detective? What mattered more to you in that moment?",
        answers: [
            "I pushed for the color! Every detail matters, you know that!",
            "I asked about the vehicle type. Colors fade, models don't.",
            "I focused on time and place. Context first—that's proper procedure.",
            "I got their contact and moved on. I had other leads to chase!"
        ],
        correctAnswer: 2
    },
    {
        question: "Evidence surfaced that contradicted your theory about Akinyi. We know you saw it. So what did you do? Did you bury it, or did you actually do your job?",
        answers: [
            "I... I set it aside. My theory was solid. It had to be right.",
            "I stopped everything. Went back to square one. The truth matters more than my ego.",
            "I looked for more evidence to confirm what I already knew. That's not bias—that's thoroughness!",
            "I noted it down, okay? But I couldn't just abandon weeks of work."
        ],
        correctAnswer: 1
    },
    {
        question: "Your superior ordered you to drop a lead. A vital one. You knew it mattered. So tell me—did you follow orders like a good soldier, or did you actually fight for Akinyi?",
        answers: [
            "I followed orders. Chain of command exists for a reason.",
            "I kept digging on my own time. Off the books. Someone had to.",
            "I fought back! I demanded they let me continue. Akinyi deserved that much.",
            "I trusted my superior. They see the bigger picture... don't they?"
        ],
        correctAnswer: 1
    },
    {
        question: "You were 80% sure. Eighty percent. Your partner begged for more evidence. But you were impatient, weren't you? What did you choose—patience or recklessness?",
        answers: [
            "I made the arrest. 80% is good enough when a girl is missing!",
            "I waited. I gathered more. I wasn't going to ruin an innocent person's life.",
            "I confronted him directly. Looked him in the eyes. You can tell a lot from a man's reaction.",
            "My gut has never failed me. I went with instinct."
        ],
        correctAnswer: 1
    },
    {
        question: "Dandora. You remember, don't you? The evidence or the witness—you could only save one. You chose the evidence. The witness died screaming. So tell me, detective... was it worth it?",
        answers: [
            "Yes. Evidence convicts. Evidence saves future victims. I'd do it again.",
            "No... God, no. I should have saved her. I replay it every night.",
            "It depends. Did the evidence lead to justice? Then maybe... maybe it was worth it.",
            "I... choose not to answer."
        ],
        correctAnswer: 3
    }
];

// ===================================
// PERFORMANCE MESSAGES
// ===================================

const winMessages = [
    "Well, look at you… a detective by accident!",
    "Congrats! You didn't mess it up… this time.",
    "Whoa, you solved it! Did the clues bribe you?",
    "Detective extraordinaire… or beginner's luck?",
    "You found the answer! The universe is confused too.",
    "Huh, you actually did it. I'll need a moment.",
    "Victory! I'll try not to faint in amazement.",
    "The case is closed… mostly thanks to you.",
    "You cracked it! Someone call the newspapers—or don't.",
    "Well done… I expected a disaster, so this is refreshing.",
    "Impressive! Did you cheat or is this natural talent?",
    "You solved it! The crime didn't see that coming either.",
    "Detective skills: activated. Ego: inflated.",
    "You win… but don't get used to it.",
    "Congratulations! You are officially less useless than last round."
];

const failMessages = [
    "Here I was rooting for you...",
    "Wow… did you get that skill from a cereal box?",
    "Are you solving crimes or just making chaos fashionable?",
    "I've seen better detective work from a lost sock.",
    "Congratulations… you just turned this case into a horror story.",
    "Detective? More like 'Guessing Expert'.",
    "Your clue-gathering is as subtle as a sledgehammer.",
    "Ah yes, another masterpiece of incorrect assumptions.",
    "Are we solving a case or auditioning for a comedy show?",
    "You've turned detective work into an extreme sport… and you're losing.",
    "If failing were an art, you'd have a museum by now."
];

/**
 * Get a random message from an array
 */
function getRandomMessage(messagesArray) {
    const randomIndex = Math.floor(Math.random() * messagesArray.length);
    return messagesArray[randomIndex];
}

// ===================================
// QUIZ STATE - Tracking Progress
// ===================================

let currentQuestionIndex = 0;
let userAnswers = []; // Stores user's selected answer for each question
let score = 0; // Track the user's score
let answerLocked = false; // Prevent changing answer after feedback
const totalQuestions = quizQuestions.length;

// ===================================
// DOM ELEMENTS
// ===================================

let questionNumber = document.getElementById('questionNumber');
let questionText = document.getElementById('questionText');
let answersContainer = document.getElementById('answersContainer');
const nextBtn = document.getElementById('nextBtn');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');

// ===================================
// QUIZ FUNCTIONS
// ===================================

/**
 * Display the current question and its answers
 */
function displayQuestion() {
    const question = quizQuestions[currentQuestionIndex];
    const questionNum = currentQuestionIndex + 1;
    
    // Reset answer lock for new question
    answerLocked = false;
    
    // Update question number and text
    questionNumber.textContent = `Question ${questionNum} of ${totalQuestions}`;
    questionText.textContent = question.question;
    
    // Update progress
    updateProgress();
    
    // Generate answer options
    const answerLabels = ['A', 'B', 'C', 'D'];
    answersContainer.innerHTML = question.answers.map((answer, index) => `
        <div class="quiz-answer" data-index="${index}">
            <div class="answer-radio"></div>
            <span>${answerLabels[index]}. "${answer}"</span>
        </div>
    `).join('');
    
    // Restore previous selection if user navigated back (future feature)
    if (userAnswers[currentQuestionIndex] !== undefined) {
        const previousChoice = userAnswers[currentQuestionIndex];
        const answerElements = answersContainer.querySelectorAll('.quiz-answer');
        const correctIndex = question.correctAnswer;
        answerElements[previousChoice].classList.add('selected');
        // Re-show feedback for previously answered questions
        answerLocked = true;
        showFeedback(answerElements, previousChoice, correctIndex, previousChoice === correctIndex);
        nextBtn.disabled = false;
    } else {
        nextBtn.disabled = true;
    }
    
    // Add click listeners to answers
    addAnswerListeners();
    
    // Update button text
    if (currentQuestionIndex === totalQuestions - 1) {
        nextBtn.textContent = 'See Results';
    } else {
        nextBtn.textContent = 'Next Question';
    }
}

/**
 * Add click event listeners to answer options
 */
function addAnswerListeners() {
    const answerElements = answersContainer.querySelectorAll('.quiz-answer');
    
    answerElements.forEach((answer, index) => {
        answer.addEventListener('click', () => {
            selectAnswer(index);
        });
    });
}

/**
 * Handle answer selection
 * @param {number} selectedIndex - The index of the selected answer
 */
function selectAnswer(selectedIndex) {
    // Prevent changing answer after feedback is shown
    if (answerLocked) return;
    
    const answerElements = answersContainer.querySelectorAll('.quiz-answer');
    const currentQuestion = quizQuestions[currentQuestionIndex];
    const correctIndex = currentQuestion.correctAnswer;
    const isCorrect = selectedIndex === correctIndex;
    
    // Lock the answer to prevent changes
    answerLocked = true;
    
    // Remove any previous selection
    answerElements.forEach(answer => {
        answer.classList.remove('selected');
    });
    
    // Add selection to clicked answer
    answerElements[selectedIndex].classList.add('selected');
    
    // Store the user's answer
    userAnswers[currentQuestionIndex] = selectedIndex;
    
    // Update score if correct
    if (isCorrect) {
        score++;
    }
    
    // Show feedback - highlight correct and incorrect answers
    showFeedback(answerElements, selectedIndex, correctIndex, isCorrect);
    
    // Enable the next button
    nextBtn.disabled = false;
    
    console.log(`Question ${currentQuestionIndex + 1}: User selected answer ${selectedIndex}`);
    console.log(`Correct: ${isCorrect}, Score: ${score}/${currentQuestionIndex + 1}`);
}

/**
 * Show visual feedback for correct/incorrect answers
 * @param {NodeList} answerElements - All answer elements
 * @param {number} selectedIndex - User's selected answer index
 * @param {number} correctIndex - Correct answer index
 * @param {boolean} isCorrect - Whether the user's answer is correct
 */
function showFeedback(answerElements, selectedIndex, correctIndex, isCorrect) {
    // Always show the correct answer in green
    answerElements[correctIndex].classList.add('correct');
    
    // If user was wrong, show their answer in red
    if (!isCorrect) {
        answerElements[selectedIndex].classList.add('incorrect');
    }
    
    // Add feedback icons
    answerElements.forEach((answer, index) => {
        const feedbackIcon = document.createElement('span');
        feedbackIcon.classList.add('feedback-icon');
        
        if (index === correctIndex) {
            feedbackIcon.textContent = ' ✅';
            feedbackIcon.classList.add('correct-icon');
        } else if (index === selectedIndex && !isCorrect) {
            feedbackIcon.textContent = ' ❌';
            feedbackIcon.classList.add('incorrect-icon');
        }
        
        if (feedbackIcon.textContent) {
            answer.appendChild(feedbackIcon);
        }
    });
}

/**
 * Update the progress bar and text
 */
function updateProgress() {
    const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;
    progressFill.style.width = `${progress}%`;
    progressText.textContent = `Question ${currentQuestionIndex + 1} of ${totalQuestions}`;
}

/**
 * Move to the next question or submit the quiz
 */
function nextQuestion() {
    // Check if an answer has been selected
    if (userAnswers[currentQuestionIndex] === undefined) {
        return; // Don't proceed without an answer
    }
    
    if (currentQuestionIndex < totalQuestions - 1) {
        // Move to next question
        currentQuestionIndex++;
        displayQuestion();
        
        // Smooth scroll to top of question
        document.querySelector('.quiz-question-block').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    } else {
        // Quiz complete - submit answers
        submitQuiz();
    }
}

/**
 * Submit the quiz and show results
 */
function submitQuiz() {
    console.log('Quiz submitted!');
    console.log('Final answers:', userAnswers);
    console.log(`Final Score: ${score} out of ${totalQuestions}`);
    
    // Calculate percentage
    const percentage = Math.round((score / totalQuestions) * 100);
    const passed = percentage >= 50; // 50% or higher is a pass
    
    // Determine performance message based on pass/fail (random each time)
    let performanceMessage, performanceClass;
    
    if (passed) {
        performanceMessage = getRandomMessage(winMessages);
        performanceClass = "passed";
    } else {
        performanceMessage = getRandomMessage(failMessages);
        performanceClass = "failed";
    }
    
    // Build the answer summary
    const answerLabels = ['A', 'B', 'C', 'D'];
    let summaryHTML = '';
    
    quizQuestions.forEach((q, index) => {
        const userAnswer = userAnswers[index];
        const correctAnswer = q.correctAnswer;
        const isCorrect = userAnswer === correctAnswer;
        
        summaryHTML += `
            <div class="result-item ${isCorrect ? 'result-correct' : 'result-incorrect'}">
                <div class="result-question-header">
                    <span class="result-icon">${isCorrect ? '✅' : '❌'}</span>
                    <span class="result-question-num">Question ${index + 1}</span>
                </div>
                <div class="result-answers">
                    <div class="result-your-answer ${isCorrect ? '' : 'wrong'}">
                        <strong>Your answer:</strong> ${answerLabels[userAnswer]}. "${q.answers[userAnswer]}"
                    </div>
                    ${!isCorrect ? `
                        <div class="result-correct-answer">
                            <strong>Correct answer:</strong> ${answerLabels[correctAnswer]}. "${q.answers[correctAnswer]}"
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    // Show the results screen
    document.querySelector('.quiz-question-block').innerHTML = `
        <div class="quiz-results">
            <h2 class="results-title">Case File Complete</h2>
            
            <div class="score-display">
                <div class="score-number">${percentage}%</div>
                <div class="score-label">Final Score</div>
            </div>
            
            <div class="performance-message ${performanceClass}">
                ${performanceMessage}
            </div>
            
            <div class="results-summary">
                <h3 class="summary-title">Answer Summary</h3>
                ${summaryHTML}
            </div>
        </div>
    `;
    
    // Hide the original next button
    nextBtn.style.display = 'none';
    
    // Create the two action buttons
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'results-buttons';
    buttonsContainer.innerHTML = `
        <button class="quiz-btn redo-btn" id="redoBtn">Redo Quiz</button>
        <button class="quiz-btn forward-btn" id="forwardBtn">Move Forward</button>
    `;
    
    // Insert buttons after the question block
    document.querySelector('.quiz-question-block').after(buttonsContainer);
    
    // Add event listeners to the buttons
    document.getElementById('redoBtn').addEventListener('click', restartQuiz);
    document.getElementById('forwardBtn').addEventListener('click', moveForward);
    
    // Update progress to 100%
    progressFill.style.width = '100%';
    progressText.textContent = 'Quiz Complete';
}

/**
 * Move forward to the next challenge
 */
function moveForward() {
    // Remove results buttons if they exist
    const resultsButtons = document.querySelector('.results-buttons');
    if (resultsButtons) {
        resultsButtons.remove();
    }
    
    // Show a "next challenge" screen (placeholder - can be customized)
    document.querySelector('.quiz-question-block').innerHTML = `
        <div class="next-challenge">
            <h2 class="results-title">Proceeding to Next Challenge...</h2>
            <p style="text-align: center; font-size: 18px; line-height: 1.7; color: rgba(255,255,255,0.8); margin-top: 20px;">
                Well done, Detective. Hold your horses!<br>
                Something is cooking. You are part of something bigger.
            </p>
            <div class="loading-indicator">
                <span>🔍</span>
            </div>
        </div>
    `;
    
    // Update progress text
    progressText.textContent = 'Next Challenge';
    
    console.log('Moving forward to next challenge...');
    // Here you would typically redirect to the next page or load the next challenge
    // window.location.href = 'next-challenge.html';
}

/**
 * Restart the quiz from the beginning
 */
function restartQuiz() {
    // Remove results buttons if they exist
    const resultsButtons = document.querySelector('.results-buttons');
    if (resultsButtons) {
        resultsButtons.remove();
    }
    
    // Reset all state
    currentQuestionIndex = 0;
    userAnswers = [];
    score = 0;
    answerLocked = false;
    
    // Restore the original question block HTML structure
    document.querySelector('.quiz-question-block').innerHTML = `
        <div class="quiz-question-number" id="questionNumber">Question 1 of ${totalQuestions}</div>
        <div class="quiz-question" id="questionText">
            Loading question...
        </div>
        <div class="quiz-answers" id="answersContainer">
            <!-- Answers will be injected by JavaScript -->
        </div>
    `;
    
    // Re-acquire DOM references since we recreated the elements
    questionNumber = document.getElementById('questionNumber');
    questionText = document.getElementById('questionText');
    answersContainer = document.getElementById('answersContainer');
    
    // Reset and show the next button
    nextBtn.style.display = 'block';
    nextBtn.disabled = true;
    nextBtn.textContent = 'Next Question';
    
    // Reset progress bar
    progressFill.style.width = '20%';
    
    // Display first question
    displayQuestion();
    
    // Scroll to top of quiz
    document.querySelector('.quiz-container').scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
    });
    
    console.log('Quiz restarted!');
}

// ===================================
// EVENT LISTENERS
// ===================================

nextBtn.addEventListener('click', nextQuestion);

// ===================================
// INITIALIZE QUIZ
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    displayQuestion();
});