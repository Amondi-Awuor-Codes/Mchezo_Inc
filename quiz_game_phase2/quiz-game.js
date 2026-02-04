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
// QUIZ STATE - Tracking Progress
// ===================================

let currentQuestionIndex = 0;
let userAnswers = []; // Stores user's selected answer for each question
const totalQuestions = quizQuestions.length;

// ===================================
// DOM ELEMENTS
// ===================================

const questionNumber = document.getElementById('questionNumber');
const questionText = document.getElementById('questionText');
const answersContainer = document.getElementById('answersContainer');
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
        answerElements[previousChoice].classList.add('selected');
        nextBtn.disabled = false;
    } else {
        nextBtn.disabled = true;
    }
    
    // Add click listeners to answers
    addAnswerListeners();
    
    // Update button text
    if (currentQuestionIndex === totalQuestions - 1) {
        nextBtn.textContent = 'Submit Answers';
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
    // Remove selection from all answers
    const answerElements = answersContainer.querySelectorAll('.quiz-answer');
    answerElements.forEach(answer => {
        answer.classList.remove('selected');
    });
    
    // Add selection to clicked answer
    answerElements[selectedIndex].classList.add('selected');
    
    // Store the user's answer
    userAnswers[currentQuestionIndex] = selectedIndex;
    
    // Enable the next button
    nextBtn.disabled = false;
    
    console.log(`Question ${currentQuestionIndex + 1}: User selected answer ${selectedIndex}`);
    console.log('Current answers:', userAnswers);
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
 * Submit the quiz and show results (placeholder for Phase 3)
 */
function submitQuiz() {
    console.log('Quiz submitted!');
    console.log('Final answers:', userAnswers);
    
    // Calculate score
    let score = 0;
    userAnswers.forEach((answer, index) => {
        if (answer === quizQuestions[index].correctAnswer) {
            score++;
        }
    });
    
    // For now, just log the results (Phase 3 will show a proper results screen)
    console.log(`Score: ${score} out of ${totalQuestions}`);
    
    // Show a temporary completion message
    document.querySelector('.quiz-question-block').innerHTML = `
        <div class="quiz-complete">
            <h2 style="color: var(--neon-amber); font-family: 'Bebas Neue', sans-serif; font-size: 32px; text-align: center; margin-bottom: 20px;">
                Case File Submitted
            </h2>
            <p style="text-align: center; font-size: 18px; line-height: 1.7; color: rgba(255,255,255,0.8);">
                Your responses have been recorded, detective.<br>
                The ethics board will review your answers.
            </p>
        </div>
    `;
    
    // Hide the next button
    nextBtn.style.display = 'none';
    
    // Update progress to 100%
    progressFill.style.width = '100%';
    progressText.textContent = 'Quiz Complete';
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