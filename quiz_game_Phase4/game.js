/* ===================================
   DETECTIVE NOIR - GAME LOGIC
   =================================== */

// Global error handler to catch any uncaught errors
window.onerror = function(message, source, lineno, colno, error) {
    console.error('GAME ERROR:', message);
    console.error('Source:', source, 'Line:', lineno, 'Col:', colno);
    console.error('Error object:', error);
    alert('Game Error: ' + message + '\nLine: ' + lineno);
    return false;
};

// Detective Image Tracking
let detectiveImage = '';

// Centralized Game State
const gameState = {
    selectedGender: null,
    detectiveName: '',
    phase: 'character-selection', // Phase I–VI, or special screens
    scene: null, // Current scene id within phase
    dialogueIndex: 0, // Current dialogue line index
    status: 'playing', // 'playing', 'paused', 'skipping', 'restarting'
    isPaused: false,
    abductionTriggered: false, // Track if abduction event has occurred
    currentMusic: null, // id of current music audio element
    currentSFX: [], // array of currently playing SFX ids
    activeTimers: {}, // { timerName: timerId }
    inventory: {
        puzzlePieces: 0,
        evidenceCollected: [],
        roomsCompleted: 0,
        items: [] // toolbox items
    },
    memoryGame: {
        tiles: [],
        flippedTiles: [],
        matchedPairs: 0,
        consecutiveFailures: 0,
        inspectedEvidence: new Set(),
        moves: 0,
        timerStarted: false
    },
    quizGame: {
        currentQuestion: 0,
        score: 0,
        answers: [],
        questionHistory: [],
        canNavigate: false,
        selectedAnswer: null
    },
    escapeRoom: {
        currentStep: 'table',
        hasScrewdriver: false,
        panelSolved: false,
        ventOpened: false,
        doorUnlocked: false,
        puzzlePiece1: false,
        puzzlePiece2: false
    },
    audio: {
        background: null, // current bg music element
        sfx: [], // currently playing sfx elements
    }
};

// Central Timer Manager
const timerManager = {
    timers: {}, // { name: timerId }
    register(name, id) { this.clear(name); this.timers[name] = id; },
    clear(name) { if (this.timers[name]) { clearTimeout(this.timers[name]); clearInterval(this.timers[name]); delete this.timers[name]; } },
    clearAll() { Object.keys(this.timers).forEach(name => this.clear(name)); },
    pauseAll() { /* implement pause logic for all timers if needed */ },
    resumeAll() { /* implement resume logic for all timers if needed */ }
};

// Central Audio Manager
const audioManager = {
    background: null,
    sfx: [],
    playMusic(id) { /* stop current, play new, update gameState.audio.background */ },
    stopMusic() { /* stop and clear bg music */ },
    playSFX(id) { /* play sfx, push to sfx array */ },
    stopAllSFX() { /* stop and clear all sfx */ },
    stopAll() { this.stopMusic(); this.stopAllSFX(); }
};

// Dialogue control handles to prevent overlapping dialogues
let __dialogueTypeInterval = null;
let __dialogueHideTimeout = null;
let __dialogueShowTimeout = null; // Track the initial show delay
let __dialogueIsTyping = false;
let __knockInterval = null; // Track continuous knocking
let __hintTimeout = null; // Track hint timeout

// Sound Effects Helper
function playSound(soundId) {
    if (!gameState.isMuted) {
        const sound = document.getElementById(soundId);
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(err => console.log('Sound play failed:', err));
        }
    }
}

// Background Music Helper
function playBackgroundMusic(musicId) {
    // Stop current music
    if (gameState.currentMusic) {
        gameState.currentMusic.pause();
        gameState.currentMusic.currentTime = 0;
        gameState.currentMusic.loop = false;
    }

    // Play new music
    if (!gameState.isMuted) {
        const music = document.getElementById(musicId);
        if (music) {
            gameState.currentMusic = music;
            music.volume = 0.3;
            music.loop = true; // Loop music throughout the phase
            music.play().catch(err => console.log('Music play failed:', err));
        }
    }
}

// Pause all background music audio elements (prevent spillover)
function pauseAllBackgroundMusic() {
    document.querySelectorAll('audio[id^="bgMusic"]').forEach(a => {
        // Only stop bgMusicPhaseII if abduction has occurred
        if (a.id === 'bgMusicPhaseII' && !gameState.abductionTriggered) {
            // Don't pause or reset if abduction hasn't happened
            return;
        }
        try { a.pause(); a.currentTime = 0; } catch(e) {}
    });
    gameState.currentMusic = null;
}

// Initialize game
window.addEventListener('load', () => {
    try {
        console.log('Window loaded - initializing game');
        // Smooth fade-in effect
        const fadeOverlay = document.getElementById('fadeOverlay');
        console.log('Fade overlay:', fadeOverlay);
        if (fadeOverlay) {
            setTimeout(() => {
                fadeOverlay.classList.add('fade-out');
                setTimeout(() => {
                    fadeOverlay.style.display = 'none';
                    console.log('Fade overlay hidden');
                }, 1200);
            }, 200); // slight delay for effect
        }

        const controlPanel = document.getElementById('controlPanel');
        console.log('Control panel:', controlPanel);
        if (controlPanel) controlPanel.classList.add('visible');
        // Hide toolbox at start
        const toolbox = document.getElementById('toolbox');
        if (toolbox) toolbox.style.display = 'none';
        // Ensure toolbox reflects any collected pieces at load
        updateToolbox();
        console.log('Game initialization complete');
    } catch (e) {
        console.error('Error in window load:', e);
        alert('Error initializing game: ' + e.message);
    }
});

// ===================================
// CHARACTER SELECTION
// ===================================

function selectCharacter(gender, event) {
    try {
        console.log('selectCharacter called with:', gender);
        playSound('soundClick');
        document.querySelectorAll('.character-card').forEach(card => {
            card.classList.remove('selected');
        });
        if (event && event.target) {
            const card = event.target.closest('.character-card');
            console.log('Card found:', card);
            if (card) card.classList.add('selected');
        }
        gameState.selectedGender = gender;
        console.log('Gender set:', gameState.selectedGender);
        // Store detective image based on selection
        if (gender === 'man') detectiveImage = 'man.jpg';
        else if (gender === 'woman') detectiveImage = 'woman.jpg';
        else detectiveImage = 'unknown.jpg';
        document.getElementById('nameInputContainer').classList.add('visible');
        document.getElementById('nameInput').focus();
    } catch (e) {
        console.error('Error in selectCharacter:', e);
        alert('Error in selectCharacter: ' + e.message);
    }
}

// Setup name input event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const nameInput = document.getElementById('nameInput');
    if (nameInput) {
        nameInput.addEventListener('input', (e) => {
            // Force uppercase in input
            e.target.value = e.target.value.toUpperCase();
            const btn = document.getElementById('confirmNameBtn');
            btn.disabled = e.target.value.trim().length === 0;
        });

        nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.target.value.trim().length > 0) {
                confirmName();
            }
        });
    }
    
    // Add backup click listener for knock scene door
    const knockScene = document.getElementById('knockScene');
    if (knockScene) {
        const videoContainer = knockScene.querySelector('.video-container');
        if (videoContainer) {
            console.log('Added backup click listener to knock scene door');
            videoContainer.addEventListener('click', function(e) {
                console.log('Door clicked via event listener!', e.target);
                openDoor();
            });
        }
    }
    
    // Global click detector for debugging
    document.body.addEventListener('click', function(e) {
        console.log('CLICK DETECTED on:', e.target.tagName, e.target.className, e.target.id);
        console.log('Click coordinates:', e.clientX, e.clientY);
        console.log('Current active phase:', document.querySelector('.phase-screen.active')?.id);
    }, true); // Use capture phase
});

function confirmName() {
    console.log('confirmName called');
    const name = document.getElementById('nameInput').value.trim();
    console.log('Name:', name, 'Gender:', gameState.selectedGender);
    if (name && gameState.selectedGender) {
        playSound('soundClick');
        gameState.detectiveName = name;
        console.log('Detective name set:', gameState.detectiveName);
        
        // Set detective icons everywhere
        document.getElementById('dialogueDetectiveIcon').src = detectiveImage;
        document.getElementById('passportInspectionImg').src = detectiveImage;
        document.getElementById('passportToolboxImg').src = detectiveImage;
        
        // Set passport details based on character
        document.getElementById('passportName').textContent = name;
        
        // Set date of birth based on character
        let dob, gender;
        if (gameState.selectedGender === 'man') {
            dob = '15/03/1988';
            gender = 'Male';
        } else if (gameState.selectedGender === 'woman') {
            dob = '22/07/1991';
            gender = 'Female';
        } else {
            dob = '08/11/1990';
            gender = 'Prefer not to say';
        }
        document.getElementById('passportDOB').textContent = dob;
        document.getElementById('passportGender').textContent = gender;
        
        showRules();
    }
}

function showRules() {
    document.getElementById('rulesOverlay').classList.add('active');
}

function closeRules() {
    playSound('soundClick');
    const rulesOverlay = document.getElementById('rulesOverlay');
    
    // Immediately hide character selection screen
    const charSelection = document.getElementById('charSelection');
    if (charSelection) {
        charSelection.classList.remove('active');
    }
    
    // Immediately switch to phase call screen
    const phaseCall = document.getElementById('phaseCall');
    if (phaseCall) {
        phaseCall.classList.add('active');
    }
    
    // Remove active class to start fade out
    rulesOverlay.classList.remove('active');
    
    // Start phase 1 music when player clicks I UNDERSTAND
    // Force play the music directly since this is user-initiated
    const music = document.getElementById('bgMusicPhaseI');
    if (music) {
        gameState.currentMusic = music;
        music.volume = 0.3;
        music.play().catch(err => {
            console.log('Music play failed:', err);
        });
    }
    
    // Wait for fade transition to complete, then hide completely and start phase
    setTimeout(() => {
        rulesOverlay.style.display = 'none';
        startPhaseI();
    }, 600);
}


// ===================================
// PHASE I - THE CALL TO ACTION
// ===================================

function startPhaseI() {
    playSound('soundClick');
    switchPhase('charSelection', 'phaseCall');
    // Music already started in closeRules()
    
    // Play detective house video and news anchor audio simultaneously
    const video = document.getElementById('detectiveHouseVideo');
    const audio = document.getElementById('newsAnchorAudio');
    
    if (video && audio) {
        video.play().catch(err => console.log('Video play failed:', err));
        audio.play().catch(err => console.log('Audio play failed:', err));
        
        // Listen for when the news anchor audio ends
        audio.addEventListener('ended', () => {
            onNewsAnchorComplete();
        }, { once: true });
    } else if (video) {
        video.play().catch(err => console.log('Video play failed:', err));
    }

    // Lower music volume when news anchor speaks
    if (gameState.currentMusic) {
        gameState.currentMusic.volume = 0.15;
    }

    // Show description box AFTER articles (around 6-7 seconds)
    // This is a storyteller box (no character icon)
    setTimeout(() => {
        showDialogue("A 12 year old girl, Akinyi Odhiambo,  has gone missing,in Kibera.", false, true);
    }, 6500);
}

function onNewsAnchorComplete() {
    // Hide the persistent dialogue box
    const dialogueBox = document.getElementById('dialogueBox');
    if (dialogueBox) {
        dialogueBox.classList.remove('active');
    }
    
    // Restore music volume when news anchor mp3 is done
    if (gameState.currentMusic) {
        gameState.currentMusic.volume = 0.3;
    }
    
    // Hard cut to black screen and play TV off sound
    playSound('soundTVOff');
    switchPhase('phaseCall', 'blackScreen');
    
    // Play breathing for 3 seconds
    const breathing = document.getElementById('soundBreathing');
    if (breathing) {
        breathing.play();
        setTimeout(() => {
            breathing.pause();
            breathing.currentTime = 0;
        }, 3000);
    }

    // Show detective's dialogue (with icon) immediately
    setTimeout(() => {
        showDialogue("I switch off the TV, tired of hearing about my failures.", true);
    }, 100);

    // First knock at 3 seconds (while still on black screen, no dialogue yet)
    setTimeout(() => {
        playSound('soundKnock');
    }, 3000);

    // After 4 seconds of black screen, transition to knock scene
    setTimeout(() => {
        // Hide dialogue before transitioning
        if (dialogueBox) {
            dialogueBox.classList.remove('active');
        }
        switchPhase('blackScreen', 'knockScene');
        
        // Disable door clicks initially
        const knockSceneContainer = document.querySelector('#knockScene .video-container');
        if (knockSceneContainer) {
            knockSceneContainer.style.pointerEvents = 'none';
        }
        
        // Show dialogues with delays
        setTimeout(() => {
            showDialogue("I hear a door knock.", true, false);
        }, 500);
        
        setTimeout(() => {
            showDialogue("I ignore it.", true, false);
        }, 3500);
        
        setTimeout(() => {
            showDialogue("The knock persists... I must answer.", true, false);
            
            // Enable door clicks after last dialogue
            setTimeout(() => {
                if (knockSceneContainer) {
                    knockSceneContainer.style.pointerEvents = 'auto';
                }
            }, 1000);
        }, 6500);
        
        // Start knock sequence
        startKnockSequence();
    }, 4000);
}

function startKnockSequence() {
    const clickableDoor = document.getElementById('clickableDoor');
    const clickDoorHint = document.getElementById('clickDoorHint');
    
    // Door is always clickable
    
    // Second knock
    setTimeout(() => {
        playSound('soundKnock');
    }, 4500);
    
    // Start continuous looping knock sound
    setTimeout(() => {
        // Start looping knock sound
        const knockSound = document.getElementById('soundKnock');
        if (knockSound && !gameState.isMuted) {
            knockSound.loop = true;
            knockSound.play().catch(err => console.log('Knock loop failed:', err));
        }
        
        // Show hint after 10 seconds if player hasn't clicked
        __hintTimeout = setTimeout(() => {
            if (clickableDoor) {
                clickableDoor.classList.add('show-hint');
            }
            if (clickDoorHint) {
                clickDoorHint.style.display = 'block';
            }
        }, 10000);
    }, 7500);
}

function openDoor() {
    console.log('openDoor() called');
    try {
        // Clear hint timeout if still active
        if (__hintTimeout) {
            clearTimeout(__hintTimeout);
            __hintTimeout = null;
        }
        
        // Stop looping knock sound
        const knockSound = document.getElementById('soundKnock');
        if (knockSound) {
            knockSound.loop = false;
            knockSound.pause();
            knockSound.currentTime = 0;
        }
    
    // Hide any active dialogue immediately
    const dialogueBox = document.getElementById('dialogueBox');
    if (dialogueBox) {
        dialogueBox.classList.remove('active');
    }
    
    // Clear any dialogue timers
    if (__dialogueTypeInterval) {
        clearInterval(__dialogueTypeInterval);
        __dialogueTypeInterval = null;
    }
    if (__dialogueHideTimeout) {
        clearTimeout(__dialogueHideTimeout);
        __dialogueHideTimeout = null;
    }
    
    playSound('soundDoorOpen');
    document.getElementById('clickableDoor').style.display = 'none';
    
    // Show envelope scene
    setTimeout(() => {
        switchPhase('knockScene', 'envelopeScene');
        
        // Show dialogue immediately when scene changes
        setTimeout(() => {
            showDialogue("I notice an envelope on the ground.", true, false);
        }, 200);
        
        // Set up hint timeout for envelope (10 seconds)
        __hintTimeout = setTimeout(() => {
            const clickableEnvelope = document.getElementById('clickableEnvelope');
            const envelopeHint = clickableEnvelope?.querySelector('p');
            if (clickableEnvelope) {
                clickableEnvelope.classList.add('show-hint');
            }
            if (envelopeHint) {
                envelopeHint.style.display = 'block';
            }
        }, 10000);
    }, 500);
    } catch (e) {
        console.error('Error in openDoor:', e);
        alert('Error in openDoor: ' + e.message);
    }
}

function pickupEnvelope() {
    // Clear hint timeout if still active
    if (__hintTimeout) {
        clearTimeout(__hintTimeout);
        __hintTimeout = null;
    }
    
    // Hide any active dialogue immediately
    const dialogueBox = document.getElementById('dialogueBox');
    if (dialogueBox) {
        dialogueBox.classList.remove('active');
    }
    
    // Clear any dialogue timers
    if (__dialogueTypeInterval) {
        clearInterval(__dialogueTypeInterval);
        __dialogueTypeInterval = null;
    }
    if (__dialogueHideTimeout) {
        clearTimeout(__dialogueHideTimeout);
        __dialogueHideTimeout = null;
    }
    
    // Play item reveal sound once
    playSound('soundEnvelopePickup');
    
    // Immediately transition to evidence scene
    switchPhase('envelopeScene', 'evidenceScene');
    document.getElementById('toolbox').classList.add('active');
}


// ===================================
// EVIDENCE INSPECTION
// ===================================
function inspectEvidence(item) {
    playSound('soundPaperRustle');
    
    // Mark as inspected
    gameState.memoryGame.inspectedEvidence.add(item);
    
    // Update visual state
    document.querySelectorAll('.evidence-item').forEach(el => {
        el.classList.remove('selected');
    });
    document.querySelectorAll('.inspection-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    const evidenceItem = event.target.closest('.evidence-item');
    evidenceItem.classList.add('selected');
    evidenceItem.classList.add('inspected');
    
    // Show the evidence detail panel on the left
    const evidenceDetail = document.querySelector('.evidence-detail');
    if (evidenceDetail) {
        evidenceDetail.classList.add('active');
    }
    
    document.getElementById(item + 'Panel').classList.add('active');

    // Play specific sounds for each item
    if (item === 'money') {
        playSound('soundMoneyCount');
    }

    // Check if all items have been inspected
    if (gameState.memoryGame.inspectedEvidence.size === 4) {
        setTimeout(() => {
            document.getElementById('evidenceChoice').classList.add('active');
        }, 2000);
    }
}

function closeEvidenceDetail() {
    // Hide the evidence detail panel
    const evidenceDetail = document.querySelector('.evidence-detail');
    if (evidenceDetail) {
        evidenceDetail.classList.remove('active');
    }
    
    // Remove selected state from evidence items
    document.querySelectorAll('.evidence-item').forEach(el => {
        el.classList.remove('selected');
    });
    
    // Hide all inspection panels
    document.querySelectorAll('.inspection-panel').forEach(panel => {
        panel.classList.remove('active');
    });
}

function acceptCase() {
    playSound('soundClick');
    
    // Stop all Phase 1 sounds immediately
    const envelopeSound = document.getElementById('soundEnvelopePickup');
    if (envelopeSound) {
        envelopeSound.pause();
        envelopeSound.currentTime = 0;
    }
    
    const paperSound = document.getElementById('soundPaperRustle');
    if (paperSound) {
        paperSound.pause();
        paperSound.currentTime = 0;
    }
    
    const moneySound = document.getElementById('soundMoneyCount');
    if (moneySound) {
        moneySound.pause();
        moneySound.currentTime = 0;
    }
    
    // Hide the choice buttons
    document.getElementById('evidenceChoice').classList.remove('active');
    
    // Close any open evidence detail panel
    closeEvidenceDetail();
    
    // Add all items to inventory and toolbox
    gameState.inventory.evidenceCollected = ['girl', 'passport', 'assignment', 'money'];
    // Show items in toolbox
    document.getElementById('passportToolbox').style.display = 'block';
    document.getElementById('assignmentToolbox').style.display = 'block';
    document.getElementById('moneyToolbox').style.display = 'block';
    document.getElementById('passportToolboxName').textContent = gameState.detectiveName;
    
    // Show transition dialogue
    showDialogue("Time to find this girl.", true, false);
    
    // Fade out phase 1 music smoothly
    const bgMusic = document.getElementById('bgMusicPhaseI');
    if (bgMusic) {
        let fadeVolume = bgMusic.volume;
        const fadeInterval = setInterval(() => {
            fadeVolume -= 0.05;
            if (fadeVolume <= 0) {
                clearInterval(fadeInterval);
                pauseAllBackgroundMusic();
            } else {
                bgMusic.volume = fadeVolume;
            }
        }, 100);
    }
    
    // Smooth transition after 3 seconds
    setTimeout(() => {
        startPhaseII();
    }, 3000);
}

function declineCase() {
    playSound('soundClick');
    
    setTimeout(() => {
        restartGame();
    }, 10000);
}

// ===================================
// PHASE II - TRANSIT & CAPTURE
// ===================================

function startPhaseII() {
    playSound('soundClick');
    switchPhase('evidenceScene', 'airportScene');
    // Ensure spy.mp3 loops for entire phase
    const bgMusic = document.getElementById('bgMusicPhaseII');
    if (bgMusic) {
        bgMusic.loop = true;
        bgMusic.currentTime = 0;
        bgMusic.play().catch(() => {});
        gameState.currentMusic = bgMusic;
        bgMusic.volume = 0.3;}
    // Show toolbox from airport scene onward
    const toolbox = document.getElementById('toolbox');
    if (toolbox) toolbox.style.display = '';

    const airportVideo = document.getElementById('airportVideo');
    if (airportVideo) {
        airportVideo.play();
    }

    showDialogue("You've arrived. Another city. Another destination shrouded in mystery.", false, false);

    setTimeout(() => {
        showDialogue("The airport buzzes with life. Something feels off.", false, false);
    }, 5000);

    setTimeout(() => {
        switchPhase('airportScene', 'strangerScene');
        playSound('soundClick');
        showDialogue("A stranger walks towards you. Cigar glowing in the dim light.", false, false);
        
        // Show floating text 1 second after scene appears
        setTimeout(() => {
            showFloatingText("I was sent by your agency.", 40, 50, true);
        }, 1000);
        
        // Show follow dialogue 2.5 seconds after floating text appears (3.5s total)
        setTimeout(() => {
            showDialogue("I don't remember authorizing this. But I follow him anyway.", true);
        }, 3500);
        
        // Start taxi scene shortly after
        setTimeout(() => {
            startTaxiScene();
        }, 6000);
    }, 10000);
}

function startTaxiScene() {
    playSound('soundClick');
    switchPhase('strangerScene', 'taxiScene');
    playSound('soundCarDoor');
    playSound('soundCarEngine');

    const taxiVideo = document.getElementById('taxiVideo');
    if (taxiVideo) {
        taxiVideo.play();
    }

    // Show text message conversation
    setTimeout(() => {
        showTextMessage("Long flight.", 'driver');
    }, 3000);

    setTimeout(() => {
        showTextMessage("Longer night.", 'player');
    }, 7000);

    setTimeout(() => {
        showTextMessage("Destination's been updated.", 'driver');
    }, 11000);

    setTimeout(() => {
        showTextMessage("That wasn't the plan.", 'player');
    }, 15000);

    setTimeout(() => {
        showDialogue("The driver takes a wrong turn. This isn't where you're supposed to be.", false, false);
    }, 19000);

    setTimeout(() => {
        startAbduction();
    }, 24000);
}

function showTextMessage(text, sender) {
    const container = document.getElementById('textMessageContainer');
    const messages = document.getElementById('textMessages');
    
    container.classList.add('active');

    const messageDiv = document.createElement('div');
    messageDiv.className = `text-message ${sender}`;
    
    const senderLabel = document.createElement('div');
    senderLabel.className = 'text-message sender';
    senderLabel.textContent = sender === 'driver' ? 'DRIVER' : 'YOU';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'text-message content';
    contentDiv.textContent = text;
    
    messageDiv.appendChild(senderLabel);
    messageDiv.appendChild(contentDiv);
    messages.appendChild(messageDiv);

    playSound('soundClick');
}

function startAbduction() {
    // Clear text messages
    document.getElementById('textMessageContainer').classList.remove('active');
    document.getElementById('textMessages').innerHTML = '';

    switchPhase('taxiScene', 'abductionScene');
    gameState.abductionTriggered = true;
    showDialogue("The driver reaches back. Before you can react—", false, false);

    setTimeout(() => {
        playSound('soundBagOverHead');
        // Prepare bgMusicPhaseII to finish its last loop
        const bgMusic = document.getElementById('bgMusicPhaseII');
        if (bgMusic) {
            bgMusic.loop = false; // Disable looping so 'ended' event fires
        }
        // showDialogue and pause will be handled after struggle.mp3
    }, 5000);

    // --- Play struggle.mp3 after spy.mp3 finishes its loop ---
    const bgMusic = document.getElementById('bgMusicPhaseII');
    if (bgMusic) {
        // Remove any previous handler
        if (bgMusic._struggleHandler) {
            bgMusic.removeEventListener('ended', bgMusic._struggleHandler);
        }
        // Handler to play struggle.mp3 after last loop
        const struggleHandler = () => {
            playSound('soundStruggle');
            // After struggle.mp3, pause bgMusicPhaseII and show abduction dialogue
            bgMusic.pause();
            bgMusic.currentTime = 0;
            showDialogue("A gun points at your head. Your world narrows to muffled sounds and panic.", false, false);
            bgMusic.removeEventListener('ended', struggleHandler);
        };
        bgMusic._struggleHandler = struggleHandler;
        bgMusic.addEventListener('ended', struggleHandler);
    }

    const abductionVideo = document.getElementById('abductionVideo');
    if (abductionVideo) {
        abductionVideo.play();
    }

    setTimeout(() => {
        startWakeUp();
    }, 10000);
}

function startWakeUp() {
    switchPhase('abductionScene', 'wakeUpScene');
    playSound('soundAmbience');

    const wakeUpVideo = document.getElementById('wakeUpVideo');
    if (wakeUpVideo) {
        wakeUpVideo.play();
    }

    showDialogue("You wake up. Your head throbs. Everything feels wrong.", false, false);

    setTimeout(() => {
        switchPhase('wakeUpScene', 'greyRoomScene');
        showDialogue("A grey room. Flickering lights. Cold concrete. No visible exits.", false, false);
    }, 5000);

    setTimeout(() => {
        // Show robot icon and play AI audio immediately on entering grey room
        showRobotIntercom();
        playAIAudio(() => {
            // After audio finishes, show room images and proceed
            showcaseRoomImages([
                'escaperoom2.png',
                'quizroom2.png',
                'reveal.png',
                'memoryroom.png'
            ]);
            setTimeout(() => {
                startMemoryRoom();
            }, 4000);
        });
    }, 10000);
}



// Show robot icon and play AI audio in grey room
function showRobotIntercom() {
    const icon = document.getElementById('robotIntercomIcon');
    if (icon) {
        icon.style.display = 'flex';
        icon.style.opacity = '1';
        icon.style.animation = 'pulse 1s infinite'; // Add pulsing effect if not present
        // Set the image source to ai.jpg if not already
        if (icon.tagName === 'IMG' && icon.src && !icon.src.includes('ai.jpg')) {
            icon.src = 'ai.jpg';
        } else if (icon.querySelector('img')) {
            icon.querySelector('img').src = 'ai.jpg';
        }
    }
}

function hideRobotIntercom() {
    const icon = document.getElementById('robotIntercomIcon');
    if (icon) {
        icon.style.display = 'none';
        icon.style.opacity = '0';
        icon.style.animation = '';
    }
}

function playAIAudio(callback) {
    // Stop all other audio per global rules
    audioManager.stopAll();
    // Play ai.mp3
    const aiAudio = document.getElementById('aiAudio');
    if (aiAudio) {
        aiAudio.currentTime = 0;
        aiAudio.play().then(() => {
            aiAudio.onended = () => {
                hideRobotIntercom();
                if (typeof callback === 'function') callback();
            };
        }).catch(err => {
            // If play fails, still show icon briefly then hide
            setTimeout(() => hideRobotIntercom(), 2000);
            if (typeof callback === 'function') callback();
        });
    } else {
        // If audio element missing, show icon briefly then hide
        setTimeout(() => hideRobotIntercom(), 2000);
        if (typeof callback === 'function') callback();
    }
}

// ===================================
// Helper to showcase four room images in sequence
function showcaseRoomImages(imageList) {
    const overlayId = 'roomShowcaseOverlay';
    let overlay = document.getElementById(overlayId);
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = overlayId;
        overlay.style.position = 'absolute';
        overlay.style.top = '8vh';
        overlay.style.left = '50%';
        overlay.style.transform = 'translateX(-50%)';
        overlay.style.width = '80vw';
        overlay.style.height = 'auto';
        overlay.style.background = 'none'; // No background
        overlay.style.borderRadius = '0';
        overlay.style.boxShadow = 'none';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '100'; // Lower than dialogue box
        overlay.style.pointerEvents = 'none'; // Don't block clicks
        document.body.appendChild(overlay);
    }
    // Room names and images in new order: Memory, Quiz, Escape, Reveal
    const roomOrder = [
        { name: 'Memory Room', img: 'memoryroom.png' },
        { name: 'Quiz Room', img: 'quizroom2.png' },
        { name: 'Escape Room', img: 'escaperoom2.png' },
        { name: 'The Reveal', img: 'reveal.png' }
    ];
    overlay.innerHTML = '';
    overlay.style.flexDirection = 'row';
    overlay.style.gap = '2vw';
    // Container for all images and names
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'row';
    container.style.gap = '2vw';
    container.style.justifyContent = 'center';
    container.style.alignItems = 'flex-end';
    container.style.width = '100%';
    container.style.height = '100%';
    overlay.appendChild(container);

    // Animation: show each image one by one, animate from big to small
    function showNext(idx) {
        if (idx >= roomOrder.length) return;
        const imgBox = document.createElement('div');
        imgBox.style.display = 'flex';
        imgBox.style.flexDirection = 'column';
        imgBox.style.alignItems = 'center';
        imgBox.style.justifyContent = 'center';
        imgBox.style.width = '22vw';
        imgBox.style.height = '50vh';
        imgBox.style.background = 'none';
        imgBox.style.opacity = '0';
        imgBox.style.transform = 'scale(2)';
        imgBox.style.transition = 'transform 0.7s cubic-bezier(.22,1.2,.36,1), opacity 0.5s';
        // Image
        const img = document.createElement('img');
        img.src = roomOrder[idx].img;
        img.alt = roomOrder[idx].name;
        img.style.maxWidth = '18vw';
        img.style.maxHeight = '32vh';
        img.style.border = '6px solid #fff';
        img.style.borderRadius = '12px';
        img.style.boxShadow = '0 0 24px #000';
        img.style.background = 'none';
        // Room name
        const label = document.createElement('div');
        label.textContent = roomOrder[idx].name;
        label.style.marginTop = '0.8em';
        label.style.fontSize = '1.5em';
        label.style.fontFamily = 'Bebas Neue, Special Elite, sans-serif';
        label.style.color = '#ffe066';
        label.style.textShadow = '2px 2px 8px #222';
        label.style.letterSpacing = '0.05em';
        label.style.fontWeight = 'bold';
        imgBox.appendChild(img);
        imgBox.appendChild(label);
        container.appendChild(imgBox);
        // Animate in
        setTimeout(() => {
            imgBox.style.opacity = '1';
            imgBox.style.transform = 'scale(1)';
        }, 50);
        // After animation, show next image
        setTimeout(() => {
            showNext(idx + 1);
        }, 900);
    }
    showNext(0);
    // Remove overlay only when memory room actually starts
    window.__removeRoomShowcaseOverlay = function() {
        if (overlay && overlay.parentNode) overlay.remove();
    };
}
// PHASE III - MEMORY ROOM
// ===================================

function startMemoryRoom() {
    playSound('soundClick');
    switchPhase('greyRoomScene', 'memoryRoom');
    // Loop memory room music until completion
    const bgMusic = document.getElementById('bgMusicPhaseIII');
    if (bgMusic) {
        bgMusic.loop = true;
        bgMusic.currentTime = 0;
        bgMusic.play().catch(() => {});
        gameState.currentMusic = bgMusic;
    }

    // Remove the floating room showcase overlay if present
    if (window.__removeRoomShowcaseOverlay) {
        window.__removeRoomShowcaseOverlay();
        window.__removeRoomShowcaseOverlay = null;
    }

    showDialogue("'Twelve pairs. Remember what matters.'", true, false, 'intercom');

    setTimeout(() => {
        initializeMemoryGame();
        // Timer will start on first card flip
    }, 5000);
}

function initializeMemoryGame() {
    // Memory game tile pairs - using image paths (12 pairs = 24 cards)
    const tilePairs = [
        'bootprint.png',
        'crimescene.png',
        'envelope.png',
        'evidencebag.png',
        'fingerprint.png',
        'floorplan.png',
        'key.png',
        'lens.png',
        'note.png',
        'notebook.png',
        'missing-person.jpg',
        'table.png'
    ];

    const tiles = [...tilePairs, ...tilePairs].sort(() => Math.random() - 0.5);
    
    const grid = document.getElementById('memoryGrid');
    grid.innerHTML = '';
    
    tiles.forEach((imagePath, index) => {
        const tile = document.createElement('div');
        tile.className = 'memory-tile';
        tile.dataset.index = index;
        tile.dataset.image = imagePath;
        
        // Calculate position in grid (6 columns x 4 rows for 24 cards)
        const col = index % 6;
        const row = Math.floor(index / 6);
        
        // Create front side (portion of complete image)
        const frontDiv = document.createElement('div');
        frontDiv.className = 'tile-front';
        const frontImg = document.createElement('img');
        frontImg.src = 'face2.jpg';
        frontImg.alt = 'Mystery Card';
        frontImg.className = 'tile-complete-image';
        
        // Position the image to show the correct portion
        // Larger tiles: approx 140x140 for the visible area, grid is 6x4
        const tileSize = 140;
        frontImg.style.objectFit = 'none';
        frontImg.style.objectPosition = `${-col * tileSize}px ${-row * tileSize}px`;
        frontImg.style.width = `${tileSize * 6}px`;
        frontImg.style.height = `${tileSize * 4}px`;
        
        frontImg.onerror = function() {
            // If complete-image.png doesn't exist, use a placeholder
            this.style.display = 'none';
            frontDiv.style.background = 'var(--noir-gray)';
            frontDiv.innerHTML = '<div style="color: var(--noir-yellow); font-size: 48px;">?</div>';
        };
        frontDiv.appendChild(frontImg);
        
        // Create back side (individual image)
        const backDiv = document.createElement('div');
        backDiv.className = 'tile-back';
        const backImg = document.createElement('img');
        backImg.src = imagePath;
        backImg.alt = 'Card ' + index;
        backImg.className = 'tile-image';
        backImg.onerror = function() {
            // If image doesn't load, show text placeholder
            this.style.display = 'none';
            backDiv.innerHTML = '<div style="color: var(--noir-yellow); font-size: 14px; text-align: center;">' + imagePath.replace('.png', '').replace('.jpg', '') + '</div>';
        };
        backDiv.appendChild(backImg);
        
        tile.appendChild(frontDiv);
        tile.appendChild(backDiv);
        
        tile.addEventListener('click', () => flipTile(tile));
        grid.appendChild(tile);
    });

    // Reset game state
    gameState.memoryGame.flippedTiles = [];
    gameState.memoryGame.matchedPairs = 0;
    gameState.memoryGame.consecutiveFailures = 0;
    gameState.memoryGame.moves = 0;
    gameState.memoryGame.timerStarted = false;
    
    updateMemoryInfo();
    
    console.log('Memory game initialized with', tiles.length, 'tiles forming complete image');
}

let memoryTimer;
let memorySeconds = 180; // 3 minutes
let memoryTimerActive = false;
let quizTimer; // Quiz room timer (if needed)
let escapeTimer; // Escape room timer

function startMemoryTimer() {
    if (memoryTimerActive) return; // Don't start multiple timers
    
    memoryTimerActive = true;
    memoryTimer = setInterval(() => {
        memorySeconds--;
        const minutes = Math.floor(memorySeconds / 60);
        const seconds = memorySeconds % 60;
        const display = document.getElementById('memoryTimer');
        display.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        if (memorySeconds === 30) {
            display.classList.add('warning');
            playSound('soundTimerWarning');
            showDialogue("'You're running out of time. Focus.'", true, false, 'intercom');
        }
        
        if (memorySeconds === 0) {
            clearInterval(memoryTimer);
            memoryTimerActive = false;
            playSound('soundTimerWarning');
            showDialogue("'Time's up. But pressure reveals character.'", true, false, 'intercom');
        }
    }, 1000);
}

function flipTile(tile) {
    // Start timer on first flip
    if (!gameState.memoryGame.timerStarted) {
        gameState.memoryGame.timerStarted = true;
        startMemoryTimer();
    }

    // Prevent flipping if:
    // 1. Already flipped
    // 2. Already matched
    // 3. Two tiles are currently flipped and being checked
    if (tile.classList.contains('flipped') || 
        tile.classList.contains('matched') ||
        gameState.memoryGame.flippedTiles.length >= 2) {
        return;
    }

    // Flip the tile
    playSound('soundClick');
    tile.classList.add('flipped');
    gameState.memoryGame.flippedTiles.push(tile);

    // If two tiles are flipped, check for match
    if (gameState.memoryGame.flippedTiles.length === 2) {
        gameState.memoryGame.moves++;
        updateMemoryInfo();
        
        // Wait for flip animation to complete before checking
        setTimeout(() => checkMemoryMatch(), 600);
    }
}

function checkMemoryMatch() {
    const [tile1, tile2] = gameState.memoryGame.flippedTiles;
    
    if (tile1.dataset.image === tile2.dataset.image) {
        // MATCH FOUND
        playSound('soundTileMatch');
        
        // Mark as matched after a short delay
        setTimeout(() => {
            tile1.classList.add('matched');
            tile2.classList.add('matched');
            gameState.memoryGame.matchedPairs++;
            gameState.memoryGame.consecutiveFailures = 0;

            updateMemoryInfo();

            // Clear flipped tiles array
            gameState.memoryGame.flippedTiles = [];

            // Check if game is complete
            if (gameState.memoryGame.matchedPairs === 12) {
                setTimeout(() => completeMemoryRoom(), 500);
            }
        }, 400);
    } else {
        // NO MATCH
        playSound('soundTileFail');
        
        // Increment consecutive failures
        gameState.memoryGame.consecutiveFailures++;
        updateMemoryInfo();

        // Flip tiles back after delay
        setTimeout(() => {
            tile1.classList.remove('flipped');
            tile2.classList.remove('flipped');
            gameState.memoryGame.flippedTiles = [];
        }, 1200);

        // Check for reshuffle condition (5 consecutive failures)
        if (gameState.memoryGame.consecutiveFailures >= 5) {
            setTimeout(() => {
                showDialogue("'You're losing the pattern. Remember what connects them.'", true, false, 'intercom');
                reshuffleMemoryTiles();
            }, 1500);
        }
    }
}

function updateMemoryInfo() {
    document.getElementById('matchCount').textContent = gameState.memoryGame.matchedPairs;
    document.getElementById('failureCount').textContent = gameState.memoryGame.consecutiveFailures;
    
    // Update moves display if element exists
    const movesDisplay = document.getElementById('movesCount');
    if (movesDisplay) {
        movesDisplay.textContent = gameState.memoryGame.moves;
    }
}

function reshuffleMemoryTiles() {
    // Get all unmatched tiles
    const unmatchedTiles = Array.from(document.querySelectorAll('.memory-tile:not(.matched)'));
    const grid = document.getElementById('memoryGrid');
    
    // Add grid pulse effect
    grid.classList.add('shuffle-active');
    
    // Play shuffle sound
    playSound('soundTileFlip');
    
    // Show dialogue first
    showDialogue("'The cards are being reshuffled... Focus harder.'", true);
    
    // Phase 1: Scatter cards with random directions
    unmatchedTiles.forEach((tile, index) => {
        // Generate random scatter values for each tile
        const scatterX = (Math.random() - 0.5) * 150;
        const scatterY = (Math.random() - 0.5) * 150;
        const scatterRot = (Math.random() - 0.5) * 360;
        
        tile.style.setProperty('--scatter-x', `${scatterX}px`);
        tile.style.setProperty('--scatter-y', `${scatterY}px`);
        tile.style.setProperty('--scatter-rot', `${scatterRot}deg`);
        
        // Stagger the animation start
        setTimeout(() => {
            tile.classList.add('shuffle-scatter');
            playSound('soundTileFlip');
        }, index * 50);
    });
    
    // Phase 2: After scatter animation, do the actual shuffle and reassign
    setTimeout(() => {
        // Get their images and shuffle them
        const images = unmatchedTiles.map(tile => tile.dataset.image).sort(() => Math.random() - 0.5);
        
        // Reassign images to tiles with a dance animation
        unmatchedTiles.forEach((tile, index) => {
            tile.dataset.image = images[index];
            const backImg = tile.querySelector('.tile-back img');
            if (backImg) {
                backImg.src = images[index];
            }
            
            // Add a secondary dance animation
            setTimeout(() => {
                tile.classList.remove('shuffle-scatter');
                tile.classList.add('shuffling');
            }, index * 30);
        });
        
        // Play another shuffle sound
        playSound('soundTileFlip');
        
    }, unmatchedTiles.length * 50 + 400);
    
    // Phase 3: Clean up animations
    setTimeout(() => {
        unmatchedTiles.forEach(tile => {
            tile.classList.remove('shuffling');
            tile.classList.remove('shuffle-scatter');
            tile.style.removeProperty('--scatter-x');
            tile.style.removeProperty('--scatter-y');
            tile.style.removeProperty('--scatter-rot');
        });
        
        grid.classList.remove('shuffle-active');
        
        // Reset consecutive failures counter
        gameState.memoryGame.consecutiveFailures = 0;
        updateMemoryInfo();
        
        showDialogue("'The tiles have been reshuffled. Pay closer attention this time.'", true);
        
    }, unmatchedTiles.length * 50 + 1200);
}

function completeMemoryRoom() {
    clearInterval(memoryTimer);
    memoryTimerActive = false;
    playSound('soundPuzzleComplete');
    // Stop memory room music
    const bgMusic = document.getElementById('bgMusicPhaseIII');
    if (bgMusic) {
        bgMusic.pause();
        bgMusic.currentTime = 0;
    }
    
    // Calculate stats
    const finalTime = 180 - memorySeconds;
    const minutes = Math.floor(finalTime / 60);
    const seconds = finalTime % 60;
    const moves = gameState.memoryGame.moves;

    // Determine performance rating
    let performance = '';
    if (moves <= 15 && finalTime <= 60) {
        performance = 'OUTSTANDING! 🌟';
    } else if (moves <= 20 && finalTime <= 90) {
        performance = 'EXCELLENT! 👏';
    } else if (moves <= 25 && finalTime <= 120) {
        performance = 'GREAT JOB! 👍';
    } else if (moves <= 30) {
        performance = 'GOOD! 😊';
    } else {
        performance = 'COMPLETED! ✓';
    }

    // Show congratulations overlay
    const overlay = document.getElementById('congratsOverlay');
    document.getElementById('finalTime').textContent = `${minutes}m ${seconds}s`;
    document.getElementById('finalMoves').textContent = moves;
    document.getElementById('performance').textContent = performance;
    overlay.classList.add('active');

    // Update game progress
    gameState.inventory.puzzlePieces++;
    gameState.inventory.roomsCompleted++;
    updateToolbox();
    updateRoomStatus(1);

    // Show dialogue after overlay
    setTimeout(() => {
        overlay.classList.remove('active');
        showDialogue(`'Time: ${minutes}m ${seconds}s. Moves: ${moves}. Not enough—but closer.'`, true);
    }, 4000);

    // Proceed to next room
    setTimeout(() => {
        startQuizRoom();
    }, 9000);
}

function restartMemoryGame() {
    playSound('soundClick');
    
    // Clear timer
    if (memoryTimer) {
        clearInterval(memoryTimer);
        memoryTimerActive = false;
    }
    
    // Reset timer display
    memorySeconds = 180;
    document.getElementById('memoryTimer').textContent = '03:00';
    document.getElementById('memoryTimer').classList.remove('warning');
    
    // Hide congratulations if showing
    document.getElementById('congratsOverlay').classList.remove('active');
    
    // Reinitialize game
    initializeMemoryGame();
    
    showDialogue("Memory game restarted. Try to complete it faster this time!");
}

// ===================================
// PHASE IV - QUIZ ROOM
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
        correct: 2,
        feedback: {
            correct: "Time and location create the timeline. Good instinct.",
            wrong: "Details matter, but context creates the full picture."
        }
    },
    {
        question: "Evidence surfaced that contradicted your theory about Akinyi. We know you saw it. So what did you do? Did you bury it, or did you actually do your job?",
        answers: [
            "I... I set it aside. My theory was solid. It had to be right.",
            "I stopped everything. Went back to square one. The truth matters more than my ego.",
            "I looked for more evidence to confirm what I already knew. That's not bias—that's thoroughness!",
            "I noted it down, okay? But I couldn't just abandon weeks of work."
        ],
        correct: 1,
        feedback: {
            correct: "In Dandora, you ignored contradictions. You've learned.",
            wrong: "Confirmation bias killed your case in Dandora. Remember?"
        }
    },
    {
        question: "Your superior ordered you to drop a lead. A vital one. You knew it mattered. So tell me—did you follow orders like a good soldier, or did you actually fight for Akinyi?",
        answers: [
            "I followed orders. Chain of command exists for a reason.",
            "I kept digging on my own time. Off the books. Someone had to.",
            "I fought back! I demanded they let me continue. Akinyi deserved that much.",
            "I trusted my superior. They see the bigger picture... don't they?"
        ],
        correct: 1,
        feedback: {
            correct: "Sometimes the right path isn't the official one.",
            wrong: "Authority isn't always right. You learned that before."
        }
    },
    {
        question: "You were 80% sure. Eighty percent. Your partner begged for more evidence. But you were impatient, weren't you? What did you choose—patience or recklessness?",
        answers: [
            "I made the arrest. 80% is good enough when a girl is missing!",
            "I waited. I gathered more. I wasn't going to ruin an innocent person's life.",
            "I confronted him directly. Looked him in the eyes. You can tell a lot from a man's reaction.",
            "My gut has never failed me. I went with instinct."
        ],
        correct: 1,
        feedback: {
            correct: "Certainty saves lives. Assumptions end them.",
            wrong: "80% means 20% chance you destroy an innocent life."
        }
    },
    {
        question: "Dandora. You remember, don't you? The evidence or the witness—you could only save one. You chose the evidence. The witness died screaming. So tell me, detective... was it worth it?",
        answers: [
            "Yes. Evidence convicts. Evidence saves future victims. I'd do it again.",
            "No... God, no. I should have saved her. I replay it every night.",
            "It depends. Did the evidence lead to justice? Then maybe... maybe it was worth it.",
            "I... choose not to answer."
        ],
        correct: 3,
        feedback: {
            correct: "Some failures don't have right answers. Only consequences.",
            wrong: "You're still trying to justify it. That's the problem."
        }
    }
];

// Random sarcastic messages for results
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

function startQuizRoom() {
    playSound('soundClick');
    switchPhase('memoryRoom', 'quizRoom');
    playBackgroundMusic('bgMusicPhaseIV');
    
    // Reset quiz state
    gameState.quizGame.currentQuestion = 0;
    gameState.quizGame.score = 0;
    gameState.quizGame.answers = [];
    gameState.quizGame.questionHistory = [];
    gameState.quizGame.canNavigate = false;
    
    showDialogue("'Every detective answers questions. Few survive their answers.'", true, false, 'intercom');

    setTimeout(() => {
        playSound('soundIntercom');
        showDialogue("'Let's talk about Mai Mahiu. The choices you made. Who you are.'", true, false, 'intercom');
    }, 5000);

    setTimeout(() => {
        displayQuestion();
    }, 10000);
}

// Display the current question
function displayQuestion() {
    const currentQ = gameState.quizGame.currentQuestion;
    
    if (currentQ >= quizQuestions.length) {
        submitQuiz();
        return;
    }
    
    const question = quizQuestions[currentQ];
    
    // Update question number and text
    document.getElementById('questionNumber').textContent = `Question ${currentQ + 1} of ${quizQuestions.length}`;
    document.getElementById('questionText').textContent = question.question;
    
    // Update progress bar
    updateProgress();
    
    // Build answer choices
    const answersContainer = document.getElementById('answersContainer');
    answersContainer.innerHTML = '';
    
    question.answers.forEach((answer, index) => {
        const answerDiv = document.createElement('div');
        answerDiv.className = 'quiz-answer';
        answerDiv.innerHTML = `
            <div class="answer-radio"></div>
            <span>${answer}</span>
        `;
        answerDiv.addEventListener('click', () => selectAnswer(index));
        answersContainer.appendChild(answerDiv);
    });
    
    // Update button text based on question number
    const nextBtn = document.getElementById('nextBtn');
    if (currentQ === 0) {
        nextBtn.textContent = 'BEGIN INTERROGATION';
    } else if (currentQ >= quizQuestions.length - 1) {
        nextBtn.textContent = 'SEE RESULTS';
    } else {
        nextBtn.textContent = 'NEXT QUESTION';
    }
    
    // Disable next button until answer is selected
    nextBtn.disabled = true;
}

// Update progress bar
function updateProgress() {
    const currentQ = gameState.quizGame.currentQuestion;
    const total = quizQuestions.length;
    const percentage = ((currentQ) / total) * 100;
    
    document.getElementById('progressFill').style.width = `${percentage}%`;
    document.getElementById('progressText').textContent = `${currentQ} of ${total} completed`;
}

// Handle answer selection
function selectAnswer(index) {
    const currentQ = gameState.quizGame.currentQuestion;
    const question = quizQuestions[currentQ];
    const answerDivs = document.querySelectorAll('.quiz-answer');
    
    // Remove previous selection
    answerDivs.forEach(div => div.classList.remove('selected'));
    
    // Add selected class to clicked answer
    answerDivs[index].classList.add('selected');
    
    // Store selected answer temporarily
    gameState.quizGame.selectedAnswer = index;
    
    // Show feedback immediately
    showFeedback(index, question, answerDivs);
}

// Show feedback for the answer
function showFeedback(selectedIndex, question, answerDivs) {
    const isCorrect = selectedIndex === question.correct;
    
    // Disable all answers
    answerDivs.forEach(div => div.style.pointerEvents = 'none');
    
    // Mark correct and incorrect
    answerDivs.forEach((div, idx) => {
        if (idx === question.correct) {
            div.classList.remove('selected');
            div.classList.add('correct');
            div.innerHTML += '<span class="feedback-icon">✓</span>';
        } else if (idx === selectedIndex && !isCorrect) {
            div.classList.remove('selected');
            div.classList.add('incorrect');
            div.innerHTML += '<span class="feedback-icon">✗</span>';
        }
    });
    
    // Record answer
    gameState.quizGame.answers.push({
        questionIndex: gameState.quizGame.currentQuestion,
        selectedAnswer: selectedIndex,
        isCorrect: isCorrect
    });
    
    if (isCorrect) {
        playSound('soundQuizCorrect');
        gameState.quizGame.score++;
    } else {
        playSound('soundQuizWrong');
    }
    
    // Show dialogue feedback
    showDialogue(`'${isCorrect ? question.feedback.correct : question.feedback.wrong}'`, true);
    
    // Enable next button
    document.getElementById('nextBtn').disabled = false;
    
    // Update button text for last question (displayQuestion will handle the rest)
    if (gameState.quizGame.currentQuestion >= quizQuestions.length - 1) {
        document.getElementById('nextBtn').textContent = 'SEE RESULTS';
    } else if (gameState.quizGame.currentQuestion === 0) {
        document.getElementById('nextBtn').textContent = 'BEGIN INTERROGATION';
    } else {
        document.getElementById('nextBtn').textContent = 'NEXT QUESTION';
    }
}

// Handle next button click
function nextQuestion() {
    gameState.quizGame.currentQuestion++;
    
    if (gameState.quizGame.currentQuestion >= quizQuestions.length) {
        submitQuiz();
    } else {
        displayQuestion();
    }
}

// Submit quiz and show results
function submitQuiz() {
    playSound('soundPuzzleComplete');
    
    gameState.inventory.puzzlePieces++;
    gameState.inventory.roomsCompleted++;
    updateToolbox();
    updateRoomStatus(2);
    
    const score = gameState.quizGame.score;
    const total = quizQuestions.length;
    const passed = score >= Math.ceil(total * 0.6); // 60% to pass
    
    // Get random message
    const messages = passed ? winMessages : failMessages;
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    
    // Build results HTML
    const container = document.querySelector('.quiz-container');
    container.innerHTML = `
        <div class="quiz-results">
            <h2 class="results-title">CASE FILE REVIEWED</h2>
            
            <div class="score-display">
                <div class="score-number">${score}/${total}</div>
                <div class="score-label">Questions Correct</div>
            </div>
            
            <div class="performance-message ${passed ? 'passed' : 'failed'}">
                "${randomMessage}"
            </div>
            
            <div class="results-buttons">
                <button class="quiz-btn redo-btn" onclick="restartQuiz()">REDO CHALLENGE</button>
                <button class="quiz-btn forward-btn" onclick="moveForward()">MOVE TO NEXT ROOM</button>
            </div>
            
            <div class="results-summary">
                <h3 class="summary-title">Your Answers</h3>
                ${buildResultsSummary()}
            </div>
        </div>
    `;
    
    // Show dialogue
    setTimeout(() => {
        if (passed) {
            showDialogue("'You've proven you can think. Now prove you can act.'", true, false, 'intercom');
        } else {
            showDialogue("'Failure is a teacher. If you survive long enough to learn.'", true, false, 'intercom');
        }
    }, 1500);
}

// Build the results summary HTML
function buildResultsSummary() {
    let html = '';
    
    quizQuestions.forEach((q, index) => {
        const userAnswer = gameState.quizGame.answers.find(a => a.questionIndex === index);
        const isCorrect = userAnswer ? userAnswer.isCorrect : false;
        const selectedIndex = userAnswer ? userAnswer.selectedAnswer : -1;
        
        html += `
            <div class="result-item ${isCorrect ? 'result-correct' : 'result-incorrect'}">
                <div class="result-question-header">
                    <span class="result-icon">${isCorrect ? '✓' : '✗'}</span>
                    <span class="result-question-num">Question ${index + 1}</span>
                </div>
                <div class="result-answers">
                    <div class="result-your-answer ${isCorrect ? '' : 'wrong'}">
                        Your answer: ${selectedIndex >= 0 ? q.answers[selectedIndex] : 'No answer'}
                    </div>
                    ${!isCorrect ? `
                        <div class="result-correct-answer">
                            Correct: ${q.answers[q.correct]}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    return html;
}

// Move forward to next challenge
function moveForward() {
    const container = document.querySelector('.quiz-container');
    container.innerHTML = `
        <div class="next-challenge">
            <h2 class="quiz-title">PREPARING NEXT CHALLENGE</h2>
            <p class="quiz-subtitle">The escape room awaits...</p>
            <div class="loading-indicator">🔒</div>
        </div>
    `;
    
    showDialogue(' You obtained a puzzle piece from Room II!', true, false, 'intercom');
    
    setTimeout(() => {
        startEscapeRoom();
    }, 3000);
}

// Restart quiz
function restartQuiz() {
    // Decrement the puzzle piece since we're retaking
    gameState.inventory.puzzlePieces--;
    gameState.inventory.roomsCompleted--;
    updateToolbox();
    
    // Reset quiz state
    gameState.quizGame.currentQuestion = 0;
    gameState.quizGame.score = 0;
    gameState.quizGame.answers = [];
    gameState.quizGame.selectedAnswer = null;
    
    // Rebuild quiz HTML
    const container = document.querySelector('.quiz-container');
    container.innerHTML = `
        <h2 class="quiz-title">THE INTERROGATION</h2>
        <p class="quiz-subtitle">"Every answer reveals who you really are."</p>
        
        <div class="quiz-progress-container">
            <div class="quiz-progress-bar">
                <div class="quiz-progress-fill" id="progressFill"></div>
            </div>
            <div class="quiz-progress-text" id="progressText">0 of 5 completed</div>
        </div>
        
        <div class="quiz-question-block" id="questionBlock">
            <div class="quiz-question-number" id="questionNumber">Question 1 of 5</div>
            <div class="quiz-question" id="questionText"></div>
            <div class="quiz-answers" id="answersContainer"></div>
        </div>
        
        <button class="quiz-next-btn" id="nextBtn" onclick="nextQuestion()" disabled>NEXT QUESTION</button>
    `;
    
    showDialogue("'Starting over. Perhaps you'll do better this time.'", true, false, 'intercom');
    
    setTimeout(() => {
        displayQuestion();
    }, 2000);
}

// ===================================
// PHASE V - ESCAPE ROOM
// ===================================

function startEscapeRoom() {
    playSound('soundClick');
    switchPhase('quizRoom', 'escapeRoom');
    playBackgroundMusic('bgMusicPhaseV');

    setTimeout(() => {
        playSound('soundAmbience');
        showDialogue("A bare industrial room,One locked door- observation and logic detective.", true, false, 'intercom');
        // Initialize guided escape room
        initEscapeRoom();
    }, 5000);

    startEscapeTimer();
}

let escapeSeconds = 300; // 5 minutes

function startEscapeTimer() {
    const display = document.getElementById('escapeTimer');
    
    escapeTimer = setInterval(() => {
        escapeSeconds--;
        const minutes = Math.floor(escapeSeconds / 60);
        const seconds = escapeSeconds % 60;
        display.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        if (escapeSeconds === 60) {
            display.classList.add('warning');
            playSound('soundTimerWarning');
            showDialogue("'You're running out of clean options. Think.'", true, false, 'intercom');
        }
        
        if (escapeSeconds === 0) {
            clearInterval(escapeTimer);
            showDialogue("'Time doesn't matter. Only escape matters. Continue.'", true, false, 'intercom');
        }
    }, 1000);
}

function interactWithZone(zone) {
    playSound('soundClick');
    
    // Check if this zone is currently active
    const currentStep = gameState.escapeRoom.currentStep;
    if (zone !== currentStep) {
        showDialogue("Focus on what's highlighted, Detective.", true, false, 'intercom');
        return;
    }
    
    // Close all zone panels
    document.querySelectorAll('.zone-detail-panel').forEach(panel => {
        panel.classList.remove('active');
    });

    // Open selected zone panel
    document.getElementById(zone + 'Detail').classList.add('active');
}

function closeZoneDetail() {
    playSound('soundClick');
    document.querySelectorAll('.zone-detail-panel').forEach(panel => {
        panel.classList.remove('active');
    });
}

function showClue(clueId, btn) {
    playSound('soundClick');
    const clue = document.getElementById(clueId);
    if (clue) {
        clue.style.display = 'block';
        btn.style.display = 'none';
    }
}

function updateActiveZone(newZone) {
    // Remove active-zone from all zones
    document.querySelectorAll('.room-zone').forEach(zone => {
        zone.classList.remove('active-zone');
    });
    
    // Add active-zone to the new zone
    const zoneMap = {
        'table': 'zoneTable',
        'vent': 'zoneVent',
        'panel': 'zonePanel',
        'door': 'zoneDoor'
    };
    
    if (zoneMap[newZone]) {
        document.getElementById(zoneMap[newZone]).classList.add('active-zone');
    }
    
    gameState.escapeRoom.currentStep = newZone;
}

function initEscapeRoom() {
    // Hide all zones except table at start
    updateActiveZone('table');
    showDialogue("The highlighted area detective.", true, false, 'intercom');
}

function solvePanel() {
    playSound('soundClick');
    gameState.escapeRoom.panelSolved = true;
    showDialogue(" 3-4-7. Think about the clues.", true, false, 'intercom');
    closeZoneDetail();
}

function takeTools() {
    playSound('soundPaperRustle');
    gameState.escapeRoom.hasScrewdriver = true;
    
    // Show screwdriver in toolbox
    document.getElementById('screwdriverToolbox').style.display = 'block';
    
    // Add screwdriver to evidence collection if not present
    if (!gameState.inventory.evidenceCollected.includes('screwdriver')) {
        gameState.inventory.evidenceCollected.push('screwdriver');
    }

    showDialogue("Great! Remember the color YELLOW. The screwdriver is now in your toolbox. Click it when needed.", true, false, 'intercom');
    closeZoneDetail();
    
    // Move to vent
    updateActiveZone('vent');
}

function useScrewdriver() {
    playSound('soundClick');
    
    if (gameState.escapeRoom.currentStep === 'vent' && gameState.escapeRoom.hasScrewdriver) {
        // Open the vent panel and show riddle
        document.querySelectorAll('.zone-detail-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById('ventDetail').classList.add('active');
        
        // Show the puzzle piece and riddle
        document.getElementById('ventPuzzleNotice').style.display = 'block';
        document.getElementById('ventRiddleSection').style.display = 'block';
        gameState.escapeRoom.puzzlePiece1 = true;
        gameState.escapeRoom.ventOpened = true;
        
        playSound('soundDoorOpen');
        showDialogue("You opened the vent with the screwdriver! You found an incomplete puzzle piece. Solve the riddle to continue.", true, false, 'intercom');
    } else if (gameState.escapeRoom.currentStep !== 'vent') {
        showDialogue("You can't use that here right now.", true, false, 'intercom');
    } else {
        showDialogue("You need to get the screwdriver first.", true, false, 'intercom');
    }
}

function openVent() {
    if (!gameState.escapeRoom.hasScrewdriver) {
        showDialogue("Use the screwdriver from your toolbox to open this vent.", true, false, 'intercom');
        return;
    }

    playSound('soundDoorOpen');
    gameState.escapeRoom.ventOpened = true;
    
    showDialogue("The vent opens, a note: 'The time she was last seen is the code.' 3:47 PM.", true, false, 'intercom');
    closeZoneDetail();
}

function solveVentRiddle() {
    const answer = document.getElementById('ventRiddleAnswer').value.toLowerCase().replace(/[-\s]/g, '');
    
    playSound('soundClick');
    
    if (answer === 'controlpanel') {
        playSound('soundQuizCorrect');
        showDialogue("Correct!. Click the control panel now.", true, false, 'intercom');
        closeZoneDetail();
        
        // Move to control panel
        updateActiveZone('panel');
    } else {
        playSound('soundQuizWrong');
        showDialogue("Think... what rhymes with 'console channel'?", true, false, 'intercom');
        document.getElementById('ventRiddleAnswer').value = '';
    }
}

function chooseCode(code) {
    playSound('soundClick');
    
    if (code === '347') {
        playSound('soundQuizCorrect');
        gameState.escapeRoom.panelSolved = true;
        gameState.escapeRoom.puzzlePiece2 = true;
        
        // Show puzzle piece notice
        document.getElementById('panelPuzzleNotice').style.display = 'block';
        
        showDialogue("Correct! You found another puzzle piece. Now unlock the door.", true, false, 'intercom');
        
        setTimeout(() => {
            closeZoneDetail();
            // Move to door
            updateActiveZone('door');
        }, 2000);
    } else {
        playSound('soundQuizWrong');
        showDialogue("Wrong choice. Remember the time... 3:47.", true, false, 'intercom');
    }
}

function tryDoorCode() {
    const code = document.getElementById('doorCode').value;
    
    playSound('soundClick');
    
    // Correct code is 347 (from the time 3:47 PM)
    if (code === '347') {
        playSound('soundDoorUnlock');
        gameState.escapeRoom.doorUnlocked = true;
        showDialogue("The door unlocks. The red light turns green. You're free.");
        
        setTimeout(() => {
            completeEscapeRoom();
        }, 5000);
    } else {
        playSound('soundQuizWrong');
        showDialogue("Wrong code. Think about when Akinyi was last seen.");
        document.getElementById('doorCode').value = '';
    }
}

function completeEscapeRoom() {
    clearInterval(escapeTimer);
    playSound('soundPuzzleComplete');
    
    // Add puzzle pieces collected in escape room
    if (gameState.escapeRoom.puzzlePiece1) {
        gameState.inventory.puzzlePieces++;
    }
    if (gameState.escapeRoom.puzzlePiece2) {
        gameState.inventory.puzzlePieces++;
    }
    gameState.inventory.roomsCompleted++;
    updateToolbox();
    updateRoomStatus(3);

    closeZoneDetail();

    showDialogue("'You learn fast when there's nowhere to hide. Now you know where to go.'", true, false, 'intercom');

    // Alert player they received puzzle pieces from this room
    const piecesCollected = (gameState.escapeRoom.puzzlePiece1 ? 1 : 0) + (gameState.escapeRoom.puzzlePiece2 ? 1 : 0);
    showDialogue(`🔵 You obtained ${piecesCollected} puzzle piece(s) from Room III!`, true, false, 'intercom');

    setTimeout(() => {
        revealEnding();
    }, 5000);
}

// ===================================
// PHASE VI - THE REVEAL
// ===================================

function revealEnding() {
    switchPhase('escapeRoom', 'revealScreen');
    playBackgroundMusic('bgMusicPhaseVI');

    setTimeout(() => {
        initializePuzzleGame();
    }, 3000);
}

// ===================================
// INTERACTIVE PUZZLE ASSEMBLY
// ===================================
// PHASE VI - PUZZLE ASSEMBLY
// ===================================

let puzzleState = {
    slots: [null, null, null, null, null, null, null, null, null, null, null, null], // 12 slots (4x3)
    draggedPiece: null,
    completed: false
};

// Puzzle grid configuration (4 columns x 3 rows = 12 pieces)
const PUZZLE_COLS = 4;
const PUZZLE_ROWS = 3;
const TOTAL_PIECES = PUZZLE_COLS * PUZZLE_ROWS;

function initializePuzzleGame() {
    // Reset puzzle state
    puzzleState = {
        slots: new Array(TOTAL_PIECES).fill(null),
        draggedPiece: null,
        completed: false
    };

    // Generate puzzle pieces in the source container (RIGHT side - scrambled)
    const sourceContainer = document.getElementById('puzzlePiecesSource');
    if (sourceContainer) {
        sourceContainer.innerHTML = '';
        
        // Create pieces in random order
        const pieceOrder = Array.from({length: TOTAL_PIECES}, (_, i) => i).sort(() => Math.random() - 0.5);
        
        pieceOrder.forEach((pieceId) => {
            const piece = document.createElement('div');
            piece.className = 'puzzle-piece draggable';
            piece.dataset.pieceId = pieceId;
            piece.draggable = true;
            
            const imgDiv = document.createElement('div');
            imgDiv.className = 'piece-image';
            imgDiv.style.backgroundImage = "url('puzzle-piece.png')";
            
            // Use PERCENTAGE-based positioning so pieces scale correctly
            // For a 4x3 grid: each piece shows 25% width and 33.33% height of the image
            const col = pieceId % PUZZLE_COLS;
            const row = Math.floor(pieceId / PUZZLE_COLS);
            
            // background-position percentages: 0%, 33.33%, 66.67%, 100% for 4 cols
            // Formula: (col / (cols-1)) * 100 for cols > 1
            const xPercent = PUZZLE_COLS > 1 ? (col / (PUZZLE_COLS - 1)) * 100 : 0;
            const yPercent = PUZZLE_ROWS > 1 ? (row / (PUZZLE_ROWS - 1)) * 100 : 0;
            
            imgDiv.style.backgroundPosition = `${xPercent}% ${yPercent}%`;
            imgDiv.style.backgroundSize = `${PUZZLE_COLS * 100}% ${PUZZLE_ROWS * 100}%`;
            
            piece.appendChild(imgDiv);
            piece.addEventListener('dragstart', handleDragStart);
            piece.addEventListener('dragend', handleDragEnd);
            sourceContainer.appendChild(piece);
        });
    }

    // Generate puzzle slots in the target board (LEFT side)
    const boardContainer = document.getElementById('puzzleBoard');
    if (boardContainer) {
        boardContainer.innerHTML = '';
        boardContainer.style.gridTemplateColumns = `repeat(${PUZZLE_COLS}, 1fr)`;
        boardContainer.style.gridTemplateRows = `repeat(${PUZZLE_ROWS}, 1fr)`;
        
        for (let i = 0; i < TOTAL_PIECES; i++) {
            const slot = document.createElement('div');
            slot.className = 'puzzle-slot';
            slot.dataset.position = i;
            
            slot.addEventListener('dragover', handleDragOver);
            slot.addEventListener('drop', handleDrop);
            slot.addEventListener('dragleave', handleDragLeave);
            boardContainer.appendChild(slot);
        }
    }
    
    // Also update the source container grid
    const sourceContainer2 = document.getElementById('puzzlePiecesSource');
    if (sourceContainer2) {
        sourceContainer2.style.gridTemplateColumns = `repeat(${PUZZLE_COLS}, 1fr)`;
        sourceContainer2.style.gridTemplateRows = `repeat(${PUZZLE_ROWS}, 1fr)`;
    }

    showDialogue("Drag the scrambled pieces from the right grid to assemble the image on the left.");
}

function handleDragStart(e) {
    const piece = e.target.closest('.puzzle-piece');
    
    // Don't allow dragging placed pieces
    if (piece.classList.contains('placed')) {
        e.preventDefault();
        return;
    }
    
    playSound('soundPaperRustle');
    puzzleState.draggedPiece = piece;
    piece.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    try {
        e.dataTransfer.setData('text/plain', piece.dataset.pieceId);
    } catch (err) {
        // Some browsers may disallow setting data for styled elements; ignore
    }
}

function handleDragEnd(e) {
    const piece = e.target.closest('.puzzle-piece');
    piece.classList.remove('dragging');
    puzzleState.draggedPiece = null;
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const slot = e.currentTarget;
    
    if (!slot.classList.contains('filled')) {
        slot.style.background = 'rgba(45, 106, 79, 0.4)';
        slot.style.borderColor = 'var(--noir-green)';
    }
}

function handleDragLeave(e) {
    const slot = e.currentTarget;
    slot.style.background = 'rgba(42, 42, 42, 0.5)';
    slot.style.borderColor = 'var(--noir-light-gray)';
}

function handleDrop(e) {
    e.preventDefault();
    const slot = e.currentTarget;
    const piece = puzzleState.draggedPiece;

    if (!piece || piece.classList.contains('placed')) {
        return;
    }

    const slotPosition = parseInt(slot.dataset.position);
    const pieceId = parseInt(piece.dataset.pieceId);

    // Check if slot is already filled
    if (puzzleState.slots[slotPosition] !== null) {
        showDialogue("That slot is already filled. Try another position.");
        return;
    }

    // Check if the piece is placed in the correct slot
    if (slotPosition === pieceId) {
        // Correct placement!
        playSound('soundTileMatch');
        
        // Move piece to slot - clone the piece-image div
        const sourceImage = piece.querySelector('.piece-image');
        const clonedImage = sourceImage.cloneNode(true);
        slot.appendChild(clonedImage);
        
        piece.classList.add('placed');
        slot.classList.add('filled');
        puzzleState.slots[slotPosition] = pieceId;
        
        // Check if puzzle is complete (all pieces placed)
        if (puzzleState.slots.every(s => s !== null)) {
            setTimeout(() => completePuzzleGame(), 800);
        }
    } else {
        // Incorrect placement
        playSound('soundTileFail');
        showDialogue(`Wrong position. That piece doesn't go there.`);
    }

    // Reset slot styling
    slot.style.background = 'rgba(42, 42, 42, 0.5)';
    slot.style.borderColor = 'var(--noir-light-gray)';
}

// Location selection state
let locationSelectionComplete = false;

function selectLocation(location) {
    console.log('selectLocation called with:', location);
    if (locationSelectionComplete) {
        console.log('Already complete, returning');
        return;
    }
    
    const choices = document.querySelectorAll('.location-choice');
    const hint = document.getElementById('locationHint');
    const clickedChoice = document.querySelector(`.location-choice[data-location="${location}"]`);
    
    // Remove previous selection classes
    choices.forEach(choice => {
        choice.classList.remove('selected-wrong', 'selected-correct');
    });
    
    if (location === 'correct') {
        // Correct choice!
        console.log('Correct location selected!');
        playSound('soundRight');
        clickedChoice.classList.add('selected-correct');
        locationSelectionComplete = true;
        showDialogue("Bingo! Found her...");
        // Hide choices and show success
        setTimeout(() => {
            console.log('Showing success screen');
            document.getElementById('locationChoices').style.display = 'none';
            hint.style.display = 'none';
            document.getElementById('locationSuccess').style.display = 'block';   
        }, 1500);
        // Proceed to video after showing location - give time to read case brief
        setTimeout(() => {            
        }, 7000);
        setTimeout(() => {
            console.log('Calling proceedToFinalScene');
            proceedToFinalScene();
        }, 10000);
    } else {
        // Wrong choice
        playSound('soundWrong');
        clickedChoice.classList.add('selected-wrong');
        // Show different hints based on wrong choice
        const wrongHints = {
            'wrong1': "No... the clues mentioned yellow paint and an industrial area. Think about what you found.",
            'wrong2': "That's not it. Remember the warehouse mentioned in the evidence? The industrial setting?",
            'wrong3': "Wrong location. The notes talked about yellow markings, an abandoned warehouse..."
        };
        hint.textContent = wrongHints[location] || "Think about the clues... the yellow paint, the industrial setting, the warehouse mentioned in the notes.";
        hint.classList.add('wrong-hint');
        showDialogue("That's not right. Think about the evidence. Where did the clues point?");
        // Reset hint styling after a moment
        setTimeout(() => {
            hint.classList.remove('wrong-hint');
            hint.textContent = "Think about the clues... the yellow piece of paper.";
        }, 4000);
    }
}

function proceedToFinalScene() {
    console.log('proceedToFinalScene called');
    switchPhase('revealScreen', 'finalScene');
    
    const finalVideo = document.getElementById('finalVideo');
    
    if (finalVideo) {
        console.log('Video element found, attempting to play');
        finalVideo.currentTime = 0;
        
        // When video ends, show empty room
        finalVideo.onended = function() {
            console.log('Video ended, showing empty room');
            showEmptyRoom();
        };
        
        // Also set a fallback timeout in case video doesn't trigger onended
        const videoDuration = finalVideo.duration || 15;
        const fallbackTimeout = setTimeout(() => {
            console.log('Fallback timeout triggered');
            if (!document.getElementById('emptyRoomScene').classList.contains('active')) {
                showEmptyRoom();
            }
        }, (videoDuration + 2) * 1000);
        
        // Store timeout to clear if video ends normally
        finalVideo.dataset.fallbackTimeout = fallbackTimeout;
        
        // Try to play with sound first
        finalVideo.muted = false;
        finalVideo.volume = 0.7;
        
        const playPromise = finalVideo.play();
        
        if (playPromise !== undefined) {
            playPromise.then(() => {
                console.log('Video playing successfully');
            }).catch(err => {
                console.log('Video play failed, trying muted:', err);
                // If autoplay fails, try muted
                finalVideo.muted = true;
                finalVideo.play().catch(err2 => {
                    console.log('Muted play also failed:', err2);
                    // If still fails, proceed after timeout
                    setTimeout(showEmptyRoom, 10000);
                });
            });
        }
    } else {
        console.log('No video element found, proceeding after delay');
        // No video element, proceed after delay
        setTimeout(showEmptyRoom, 10000);
    }

    playSound('soundCarEngine');
    
    showDialogue("I rush to the location. I can't be too late. Not this time.", true, false, 'detective');
    
    // Arrival dialogue during video
    setTimeout(() => {
        playSound('soundDoorOpen');
        showDialogue("I arrive. The building looms before me. Silent. Waiting.", true, false, 'detective');
    }, 5000);
}

function showEmptyRoom() {
    console.log('showEmptyRoom called');
    // Pause the video if still playing
    const finalVideo = document.getElementById('finalVideo');
    if (finalVideo) {
        finalVideo.pause();
        finalVideo.onended = null;
        // Clear fallback timeout
        if (finalVideo.dataset.fallbackTimeout) {
            clearTimeout(parseInt(finalVideo.dataset.fallbackTimeout));
        }
    }
    
    switchPhase('finalScene', 'emptyRoomScene');
    
    showDialogue("The room is empty. Signs of recent presence. A chair out of place. The light still warm.", true, false, 'detective');

    // The realization
    setTimeout(() => {
        showDialogue("I'm too late. They held her here.", true, false, 'detective');
    }, 5000);

    // Final lingering on empty room
    setTimeout(() => {
        showDialogue("The silence is deafening. I failed ... again...", true, false, 'detective');
    }, 10000);

    // End screen
    setTimeout(() => {
        switchPhase('emptyRoomScene', 'endScreen');
    }, 15000);
}

function completePuzzleGame() {
    console.log('completePuzzleGame called');
    if (puzzleState.completed) {
        console.log('Puzzle already completed, returning');
        return;
    }
    
    puzzleState.completed = true;
    playSound('soundPuzzleComplete');

    // Get puzzle elements
    const board = document.querySelector('.puzzle-board');
    const puzzleAssembly = document.getElementById('puzzleAssembly');
    const puzzleLayout = document.querySelector('.puzzle-layout');
    const puzzleSource = document.querySelector('.puzzle-source');
    const puzzleTarget = document.querySelector('.puzzle-target');
    
    // Animate the completed puzzle with glow
    board.style.boxShadow = '0 0 60px rgba(45, 106, 79, 0.8)';
    
    
    // After a brief moment, show the completed puzzle with description
    setTimeout(() => {
        // Hide the source pieces container
        if (puzzleSource) puzzleSource.style.display = 'none';
        
        // Show the puzzle complete info on the right
        const puzzleCompleteInfo = document.getElementById('puzzleCompleteInfo');
        if (puzzleCompleteInfo) {
            puzzleCompleteInfo.style.display = 'flex';
        }
        
        // Remove gaps between pieces to form one continuous image
        board.classList.add('puzzle-complete');
        
        // Make puzzle fullscreen
        if (puzzleTarget) {
            puzzleTarget.classList.add('puzzle-fullscreen');
        }
        
    
    }, 1500);

    setTimeout(() => {
        gameState.inventory.puzzlePieces = 4;
        gameState.inventory.roomsCompleted = 4;
        updateToolbox();
        updateRoomStatus(4);

    }, 4000);

    // Show the location choice screen - this is where the player MUST click the correct building
    setTimeout(() => {
        console.log('Showing location choices');
        document.getElementById('puzzleAssembly').style.display = 'none';
        document.getElementById('locationReveal').style.display = 'block';
        locationSelectionComplete = false;
        
        showDialogue("Four locations. Only one is correct. Use the evidence you've gathered.");
        // The game waits here until player clicks the correct building
        // proceedToFinalScene() is only called from selectLocation('correct')
    }, 7000);
}

// ===================================
// TOOLBOX FUNCTIONS
// ===================================

function toggleToolbox() {
    playSound('soundClick');
    document.getElementById('toolbox').classList.toggle('expanded');
}

function viewToolboxItem(item) {
    playSound('soundPaperRustle');
    
    // Show item details in a dialogue
    if (item === 'bag') {
        // Render and show bag overlay with collected items
        renderBagOverlay();
        const overlay = document.getElementById('bagOverlay');
        if (overlay) overlay.style.display = 'flex';
    } else if (item === 'photo') {
        showDialogue("Akinyi Odhiambo. Age 12. Last seen 3 days ago. Red jacket. Blue backpack. Near Gikomba Market area.");
    } else if (item === 'passport') {
        showDialogue(`Your passport. ${gameState.detectiveName}. Valid for international travel. Someone wanted you far from Nairobi.`);
    } else if (item === 'assignment') {
        showDialogue("Assignment: Locate Akinyi Odhiambo. Handler: Anonymous. Note: 'Don't fail like Dandora.'");
    } else if (item === 'money') {
        showDialogue("KSH 500,000 in unmarked bills. Either complete trust or complete desperation.");
    }
}

function updateToolbox() {
    // Update numeric count
    document.getElementById('puzzleCount').textContent = gameState.inventory.puzzlePieces;

    // Render collected puzzle-piece thumbnails in the toolbox (in collection order)
    const container = document.getElementById('puzzlePiecesContainer');
    if (!container) return;
    container.innerHTML = '';

    for (let i = 0; i < gameState.inventory.puzzlePieces; i++) {
        const thumb = document.createElement('div');
        thumb.className = 'toolbox-piece-thumb';
        const img = document.createElement('img');
        img.src = 'puzzle-piece.png';
        img.alt = `Puzzle piece ${i + 1}`;
        img.className = 'toolbox-piece-img';
        thumb.appendChild(img);
        container.appendChild(thumb);
    }
}

// Render contents of the evidence bag into the overlay
function renderBagOverlay() {
    const grid = document.getElementById('bagGrid');
    if (!grid) return;
    grid.innerHTML = '';

    // Ensure screwdriver and any known evidence are included
    const collected = gameState.inventory.evidenceCollected.slice();

    // Render evidence items first
    collected.forEach(item => {
        const el = document.createElement('div');
        el.className = 'bag-item';
        el.onclick = () => showBagItemDetail(item);
        const img = document.createElement('img');
        img.alt = item;
        if (item === 'screwdriver') img.src = 'screwdriver.png';
        else if (item === 'passport') img.src = 'passport.png';
        else if (item === 'assignment') img.src = 'assignment.png';
        else if (item === 'money') img.src = 'money.png';
        else if (item === 'girl') img.src = 'missing-girl.png';
        else img.src = 'item.png';
        img.onerror = () => { img.src = 'item.png'; };
        const label = document.createElement('div');
        label.textContent = item.replace(/-/g, ' ').toUpperCase();
        el.appendChild(img);
        el.appendChild(label);
        grid.appendChild(el);
    });

    // Then show puzzle pieces thumbnails (as many as puzzlePieces)
    for (let i = 0; i < gameState.inventory.puzzlePieces; i++) {
        const el = document.createElement('div');
        el.className = 'bag-item';
        el.onclick = () => showBagItemDetail('puzzle-' + (i+1));
        const img = document.createElement('img');
        img.src = 'puzzle-piece.png';
        img.onerror = () => { img.src = 'puzzle-piece.png'; };
        const label = document.createElement('div');
        label.textContent = `PUZZLE PIECE ${i+1}`;
        el.appendChild(img);
        el.appendChild(label);
        grid.appendChild(el);
    }
}

// Show details for clicked bag item
function showBagItemDetail(item) {
    playSound('soundPaperRustle');
    if (item === 'girl') {
        showDialogue("Akinyi Odhiambo. Age 12. Last seen near Gikomba Market. Red jacket, blue backpack.");
    } else if (item === 'passport') {
        showDialogue(`Your passport. ${gameState.detectiveName}. Someone wanted you far from Nairobi.`);
    } else if (item === 'assignment') {
        showDialogue("Assignment: Locate Akinyi Odhiambo. Note: 'Don't fail like Dandora.'");
    } else if (item === 'money') {
        showDialogue("KSH 500,000 in unmarked bills. Either complete trust or complete desperation.");
    } else if (item === 'screwdriver') {
        showDialogue("A rusty screwdriver. Found in the escape room. Useful for opening vents.");
    } else if (item.startsWith('puzzle-')) {
        const num = item.replace('puzzle-', '');
        showDialogue(`Puzzle piece ${num} of 4. Collected from Room ${num}.`);
    }
}

function closeBagOverlay() {
    const overlay = document.getElementById('bagOverlay');
    if (overlay) overlay.style.display = 'none';
}

function updateRoomStatus(roomNumber) {
    document.getElementById(`room${roomNumber}Status`).textContent = '✓';
}

// ===================================
// CONTROL PANEL FUNCTIONS
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    // Pause Button
    const pauseBtn = document.getElementById('pauseBtn');
    if (pauseBtn) {
        pauseBtn.addEventListener('click', () => {
            playSound('soundClick');
            gameState.isPaused = !gameState.isPaused;
            
            if (gameState.isPaused) {
                // Pause all timers
                if (memoryTimer) clearInterval(memoryTimer);
                if (quizTimer) clearInterval(quizTimer);
                if (escapeTimer) clearInterval(escapeTimer);
                
                // Pause music
                if (gameState.currentMusic) {
                    gameState.currentMusic.pause();
                }
                // Pause videos
                document.querySelectorAll('video').forEach(video => video.pause());
                // Pause audio elements
                document.querySelectorAll('audio').forEach(audio => {
                    // Don't pause bgMusicPhaseII unless abduction has happened
                    if (audio.id === 'bgMusicPhaseII' && !gameState.abductionTriggered) return;
                    audio.pause();
                });
            } else {
                // Resume music
                if (gameState.currentMusic) {
                    // Resume bgMusicPhaseII only if abduction hasn't happened
                    if (gameState.currentMusic.id === 'bgMusicPhaseII' && !gameState.abductionTriggered) {
                        gameState.currentMusic.play().catch(() => {});
                    } else {
                        gameState.currentMusic.play().catch(() => {});
                    }
                }
                // Resume videos
                document.querySelectorAll('video').forEach(video => video.play());
            }
        });
    }

    // Play Button -> Back Button
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            playSound('soundClick');
            goToPreviousPhase();
        });
    }

    // Mute Button
    const muteBtn = document.getElementById('muteBtn');
    if (muteBtn) {
        muteBtn.addEventListener('click', () => {
            // Play click sound before muting
            const clickSound = document.getElementById('soundClick');
            if (clickSound && !gameState.isMuted) {
                clickSound.currentTime = 0;
                clickSound.play().catch(err => console.log('Sound play failed:', err));
            }
            
            gameState.isMuted = !gameState.isMuted;
            
            if (gameState.isMuted) {
                // Mute all audio
                if (gameState.currentMusic) {
                    gameState.currentMusic.pause();
                }
                document.querySelectorAll('audio').forEach(audio => audio.pause());
                document.getElementById('muteBtn').textContent = 'Unmute';
            } else {
                // Unmute
                if (gameState.currentMusic) {
                    gameState.currentMusic.play();
                }
                document.getElementById('muteBtn').textContent = 'Mute';
            }
        });
    }

    // Clue Button
    const clueBtn = document.getElementById('clueBtn');
    if (clueBtn) {
        clueBtn.addEventListener('click', () => {
            playSound('soundClick');
            
            // Provide contextual clues based on current phase
            const activePhase = document.querySelector('.phase-screen.active');
            
            if (activePhase && activePhase.id === 'memoryRoom') {
                showDialogue("CLUE: Look for connections between symbols. Locations, objects, and people are linked. Match by theme, not just image.");
            } else if (activePhase && activePhase.id === 'quizRoom') {
                showDialogue("CLUE: Think about what you learned from Mai Mahiu. What would a better detective do differently?");
            } else if (activePhase && activePhase.id === 'escapeRoom') {
                showDialogue("CLUE: The time Akinyi was last seen (3:47 PM) is important. The control panel shows 3-4-7. The vent blueprint shows the path.");
            } else {
                showDialogue("Look carefully. The answer is in the details you've already seen. Evidence tells a story.");
            }
        });
    }

    // Restart Button
    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) {
        restartBtn.addEventListener('click', restartGame);
    }
    
    // Skip Button
    const skipBtn = document.getElementById('skipBtn');
    if (skipBtn) {
        skipBtn.addEventListener('click', () => {
            skipCurrentPhase();
        });
    }

    // Quiz Navigation Buttons
    const prevQuestionBtn = document.getElementById('prevQuestionBtn');
    if (prevQuestionBtn) {
        prevQuestionBtn.addEventListener('click', () => {
            playSound('soundClick');
            goToPreviousQuestion();
        });
    }

    const nextQuestionBtn = document.getElementById('nextQuestionBtn');
    if (nextQuestionBtn) {
        nextQuestionBtn.addEventListener('click', () => {
            playSound('soundClick');
            goToNextQuestion();
        });
    }

    const redoQuestionBtn = document.getElementById('redoQuestionBtn');
    if (redoQuestionBtn) {
        redoQuestionBtn.addEventListener('click', () => {
            playSound('soundClick');
            redoCurrentQuestion();
        });
    }

    const restartQuizBtn = document.getElementById('restartQuizBtn');
    if (restartQuizBtn) {
        restartQuizBtn.addEventListener('click', () => {
            playSound('soundClick');
            restartQuiz();
        });
    }
});

function restartGame() {
    playSound('soundClick');
    
    if (confirm('Are you sure you want to restart? All progress will be lost.')) {
        location.reload();
    }
}

// ===================================
// UTILITY FUNCTIONS
// ===================================

function switchPhase(fromId, toId) {
    console.log(`switchPhase called: ${fromId} -> ${toId}`);
    const fromElement = document.getElementById(fromId);
    const toElement = document.getElementById(toId);
    console.log('fromElement:', fromElement);
    console.log('toElement:', toElement);
    
    // Only clear text messages when switching phases, but leave dialogue box alone
    // so that dialogues can be shown immediately after phase switches
    const textMessageContainer = document.getElementById('textMessageContainer');
    if (textMessageContainer) {
        textMessageContainer.classList.remove('active');
    }
    const textMessages = document.getElementById('textMessages');
    if (textMessages) {
        textMessages.innerHTML = '';
    }
    
    // Don't pause music during phase 1 transitions (charSelection -> phaseCall -> blackScreen -> knockScene -> envelopeScene -> evidenceScene)
    // Music continues through phase 1
    const phase1Scenes = ['blackScreen', 'knockScene', 'envelopeScene', 'evidenceScene'];
    if (!(fromId === 'charSelection' && toId === 'phaseCall') && !phase1Scenes.includes(toId)) {
        // Pause any lingering background music before phase change
        pauseAllBackgroundMusic();
    }

    // Smooth fade transition
    if (fromElement) {
        fromElement.style.transition = 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
        fromElement.style.opacity = '0';
        setTimeout(() => {
            fromElement.classList.remove('active');
            fromElement.style.opacity = '';
        }, 600);
    }
    if (toElement) {
        toElement.style.opacity = '0';
        toElement.classList.add('active');
        setTimeout(() => {
            toElement.style.transition = 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            toElement.style.opacity = '1';
            console.log(`${toId} is now active and visible`);
        }, 50);
    }
}

function showDialogue(text, isAI = false, persistent = false, iconType = 'detective') {
    const dialogueBox = document.getElementById('dialogueBox');
    const dialogueText = document.getElementById('dialogueText');
    const dialogueIcon = document.getElementById('dialogueDetectiveIcon');
    // Prevent overlapping: clear any previous typing/hide/show timers
    if (__dialogueTypeInterval) {
        clearInterval(__dialogueTypeInterval);
        __dialogueTypeInterval = null;
    }
    if (__dialogueHideTimeout) {
        clearTimeout(__dialogueHideTimeout);
        __dialogueHideTimeout = null;
    }
    if (__dialogueShowTimeout) {
        clearTimeout(__dialogueShowTimeout);
        __dialogueShowTimeout = null;
    }

    // Hide then show (reset) so CSS transition plays consistently
    dialogueBox.classList.remove('active');
    dialogueBox.classList.remove('character');
    dialogueBox.classList.remove('intercom');

    __dialogueShowTimeout = setTimeout(() => {
        __dialogueShowTimeout = null; // Clear reference once executed
        // Add character class if this is spoken by a character
        if (isAI) {
            if (iconType === 'intercom') {
                dialogueBox.classList.add('intercom');
                dialogueIcon.src = 'robot.jpg';
            } else {
                dialogueBox.classList.add('character');
                dialogueIcon.src = detectiveImage;
            }
        }
        
        dialogueBox.classList.add('active');
        dialogueText.textContent = '';
        dialogueText.classList.add('typing');
        __dialogueIsTyping = true;

        let index = 0;
        __dialogueTypeInterval = setInterval(() => {
            if (index < text.length) {
                dialogueText.textContent += text[index];
                index++;
            } else {
                clearInterval(__dialogueTypeInterval);
                __dialogueTypeInterval = null;
                dialogueText.classList.remove('typing');
                __dialogueIsTyping = false;

                // If persistent mode, keep dialogue visible (don't auto-hide)
                // Otherwise, keep dialogue visible for 4 seconds after typing completes
                if (!persistent) {
                    __dialogueHideTimeout = setTimeout(() => {
                        dialogueBox.classList.remove('active');
                        __dialogueHideTimeout = null;
                    }, 4000);
                }
            }
        }, 30);
    }, 180);
}

function showFloatingText(text, topPercent, leftPercent, isSpeaker = false) {
    const floatingDiv = document.createElement('div');
    floatingDiv.className = 'floating-text';
    if (isSpeaker) floatingDiv.classList.add('speaker');
    
    floatingDiv.textContent = text;
    floatingDiv.style.top = `${topPercent}%`;
    floatingDiv.style.left = `${leftPercent}%`;
    
    document.querySelector('.game-container').appendChild(floatingDiv);
    
    setTimeout(() => {
        floatingDiv.remove();
    }, 4000);
}

// ===================================
// CONTROL PANEL AUTO-HIDE
// ===================================

let controlPanelElement = null;
let controlTimeout;

document.addEventListener('DOMContentLoaded', () => {
    controlPanelElement = document.getElementById('controlPanel');
});

document.addEventListener('mousemove', (e) => {
    if (!controlPanelElement) return;
    if (e.clientX > window.innerWidth - 250 && e.clientY < 100) {
        controlPanelElement.classList.add('visible');
        clearTimeout(controlTimeout);
        controlTimeout = setTimeout(() => {
            if (e.clientX < window.innerWidth - 250 || e.clientY > 100) {
                controlPanelElement.classList.remove('visible');
            }
        }, 3000);
    }
});

// ===================================
// KEYBOARD SHORTCUTS
// ===================================

document.addEventListener('keydown', (e) => {
    // P - Pause/Play
    if (e.key === 'p' || e.key === 'P') {
        const pauseBtn = document.getElementById('pauseBtn');
        if (pauseBtn) pauseBtn.click();
    }
    
    // M - Mute
    if (e.key === 'm' || e.key === 'M') {
        const muteBtn = document.getElementById('muteBtn');
        if (muteBtn) muteBtn.click();
    }
    
    // C - Clue
    if (e.key === 'c' || e.key === 'C') {
        const clueBtn = document.getElementById('clueBtn');
        if (clueBtn) clueBtn.click();
    }
    
    // T - Toggle Toolbox
    if (e.key === 't' || e.key === 'T') {
        toggleToolbox();
    }
    
    // S - Skip Phase
    if (e.key === 's' || e.key === 'S') {
        skipCurrentPhase();
    }
});

// ===================================
// SKIP PHASE FUNCTIONALITY
// ===================================

function clearAllDialoguesAndMessages() {
    // Clear dialogue timers
    if (__dialogueTypeInterval) {
        clearInterval(__dialogueTypeInterval);
        __dialogueTypeInterval = null;
    }
    if (__dialogueHideTimeout) {
        clearTimeout(__dialogueHideTimeout);
        __dialogueHideTimeout = null;
    }
    if (__dialogueShowTimeout) {
        clearTimeout(__dialogueShowTimeout);
        __dialogueShowTimeout = null;
    }
    
    // Hide dialogue box
    const dialogueBox = document.getElementById('dialogueBox');
    if (dialogueBox) {
        dialogueBox.classList.remove('active');
        dialogueBox.classList.remove('character');
        dialogueBox.classList.remove('intercom');
    }
    
    // Clear text messages
    const textMessageContainer = document.getElementById('textMessageContainer');
    if (textMessageContainer) {
        textMessageContainer.classList.remove('active');
    }
    const textMessages = document.getElementById('textMessages');
    if (textMessages) {
        textMessages.innerHTML = '';
    }
    
    // Remove all floating text elements
    document.querySelectorAll('.floating-text').forEach(el => el.remove());
    
    // Clear hint timeout if exists
    if (__hintTimeout) {
        clearTimeout(__hintTimeout);
        __hintTimeout = null;
    }
}

function goToPreviousPhase() {
    // Find the currently active phase
    const activePhase = document.querySelector('.phase-screen.active');
    if (!activePhase) return;
    
    const phaseId = activePhase.id;
    
    // Clear any active timers
    if (memoryTimer) { clearInterval(memoryTimer); memoryTimerActive = false; }
    if (quizTimer) { clearInterval(quizTimer); }
    if (escapeTimer) { clearInterval(escapeTimer); }
    
    // Clear knock sounds
    const knockSound = document.getElementById('soundKnock');
    if (knockSound) { knockSound.loop = false; knockSound.pause(); knockSound.currentTime = 0; }
    
    // Clear all dialogues and messages from previous phase
    clearAllDialoguesAndMessages();
    
    // Go to previous phase based on current phase
    switch(phaseId) {
        case 'charSelection':
            // Already at the start
            showDialogue("You're at the beginning. There's no going back from here.");
            break;
        case 'phaseCall':
            switchPhase(phaseId, 'charSelection');
            break;
        case 'blackScreen':
            switchPhase(phaseId, 'phaseCall');
            break;
        case 'knockScene':
            switchPhase(phaseId, 'blackScreen');
            startBlackScreen();
            break;
        case 'envelopeScene':
            switchPhase(phaseId, 'knockScene');
            startKnockSequence();
            break;
        case 'evidenceScene':
            switchPhase(phaseId, 'envelopeScene');
            break;
        case 'airportScene':
            switchPhase(phaseId, 'evidenceScene');
            document.getElementById('toolbox').classList.add('active');
            break;
        case 'strangerScene':
            switchPhase(phaseId, 'airportScene');
            pauseAllBackgroundMusic();
            playBackgroundMusic('bgMusicPhaseII');
            break;
        case 'taxiScene':
            switchPhase(phaseId, 'strangerScene');
            break;
        case 'abductionScene':
            switchPhase(phaseId, 'taxiScene');
            break;
        case 'wakeUpScene':
            switchPhase(phaseId, 'abductionScene');
            break;
        case 'greyRoomScene':
            switchPhase(phaseId, 'wakeUpScene');
            break;
        case 'memoryRoom':
            switchPhase(phaseId, 'greyRoomScene');
            pauseAllBackgroundMusic();
            playBackgroundMusic('bgMusicPhaseII');
            break;
        case 'quizRoom':
            switchPhase(phaseId, 'memoryRoom');
            pauseAllBackgroundMusic();
            playBackgroundMusic('bgMusicPhaseIII');
            initializeMemoryGame();
            break;
        case 'escapeRoom':
            switchPhase(phaseId, 'quizRoom');
            pauseAllBackgroundMusic();
            playBackgroundMusic('bgMusicPhaseIV');
            gameState.quizGame.currentQuestion = 0;
            gameState.quizGame.score = 0;
            displayQuestion();
            break;
        case 'revealScreen':
            switchPhase(phaseId, 'escapeRoom');
            pauseAllBackgroundMusic();
            playBackgroundMusic('bgMusicPhaseV');
            startEscapeTimer();
            break;
        case 'endScreen':
            switchPhase(phaseId, 'revealScreen');
            pauseAllBackgroundMusic();
            playBackgroundMusic('bgMusicPhaseVI');
            break;
        default:
            showDialogue("Cannot go back from this phase.");
            break;
    }
}

function skipCurrentPhase() {
    playSound('soundClick');
    
    // Find the currently active phase
    const activePhase = document.querySelector('.phase-screen.active');
    if (!activePhase) return;
    
    const phaseId = activePhase.id;
    
    // Clear any active timers
    if (memoryTimer) { clearInterval(memoryTimer); memoryTimerActive = false; }
    if (quizTimer) { clearInterval(quizTimer); }
    if (escapeTimer) { clearInterval(escapeTimer); }
    
    // Clear knock sounds
    const knockSound = document.getElementById('soundKnock');
    if (knockSound) { knockSound.loop = false; knockSound.pause(); knockSound.currentTime = 0; }
    
    // Clear all dialogues and messages from previous phase
    clearAllDialoguesAndMessages();
    
    // Skip to next phase based on current phase - INSTANT transitions
    switch(phaseId) {
        case 'charSelection':
            // Can't skip character selection
            showDialogue("Please select a character to continue.");
            break;
        case 'phaseCall':
        case 'blackScreen':
        case 'knockScene':
        case 'envelopeScene':
            // Skip to evidence scene instantly
            pauseAllBackgroundMusic();
            playBackgroundMusic('bgMusicPhaseI');
            switchPhase(phaseId, 'evidenceScene');
            document.getElementById('toolbox').classList.add('active');
            gameState.memoryGame.inspectedEvidence = new Set(['girl', 'passport', 'assignment', 'money']);
            document.getElementById('evidenceChoice').classList.add('active');
            break;
        case 'evidenceScene':
            // Skip to phase II instantly - bypass acceptCase delays
            document.getElementById('evidenceChoice').classList.remove('active');
            closeEvidenceDetail();
            gameState.inventory.evidenceCollected = ['girl', 'passport', 'assignment', 'money'];
            document.getElementById('passportToolbox').style.display = 'block';
            document.getElementById('assignmentToolbox').style.display = 'block';
            document.getElementById('moneyToolbox').style.display = 'block';
            document.getElementById('passportToolboxName').textContent = gameState.detectiveName;
            pauseAllBackgroundMusic();
            startPhaseII();
            break;
        case 'airportScene':
        case 'strangerScene':
        case 'taxiScene':
        case 'abductionScene':
        case 'wakeUpScene':
        case 'greyRoomScene':
            // Skip to memory room instantly
            document.getElementById('textMessageContainer').classList.remove('active');
            document.getElementById('textMessages').innerHTML = '';
            pauseAllBackgroundMusic();
            switchPhase(phaseId, 'memoryRoom');
            playBackgroundMusic('bgMusicPhaseIII');
            initializeMemoryGame();
            break;
        case 'memoryRoom':
            // Complete memory room instantly - bypass delays
            clearInterval(memoryTimer);
            memoryTimerActive = false;
            gameState.memoryGame.matchedPairs = 12;
            gameState.inventory.puzzlePieces++;
            gameState.inventory.roomsCompleted++;
            updateToolbox();
            updateRoomStatus(1);
            document.getElementById('congratsOverlay').classList.remove('active');
            startQuizRoom();
            break;
        case 'quizRoom':
            // Complete quiz room instantly
            gameState.quizGame.score = quizQuestions.length;
            gameState.quizGame.currentQuestion = quizQuestions.length;
            gameState.inventory.puzzlePieces++;
            gameState.inventory.roomsCompleted++;
            updateToolbox();
            updateRoomStatus(2);
            startEscapeRoom();
            break;
        case 'escapeRoom':
            // Complete escape room instantly - bypass delays
            clearInterval(escapeTimer);
            gameState.escapeRoom.doorUnlocked = true;
            gameState.inventory.puzzlePieces++;
            gameState.inventory.roomsCompleted++;
            updateToolbox();
            updateRoomStatus(3);
            closeZoneDetail();
            revealEnding();
            break;
        case 'revealScreen':
            // Complete puzzle and show location choices
            puzzleState.completed = true;
            gameState.inventory.puzzlePieces = 4;
            gameState.inventory.roomsCompleted = 4;
            updateToolbox();
            updateRoomStatus(4);
            document.getElementById('puzzleAssembly').style.display = 'none';
            document.getElementById('locationReveal').style.display = 'block';
            locationSelectionComplete = false;
            showDialogue("Select the correct location to proceed.");
            break;
        case 'finalScene':
        case 'emptyRoomScene':
            // Skip to end
            switchPhase(phaseId, 'endScreen');
            break;
        default:
            showDialogue("Cannot skip this phase.");
    }
}

// ===================================
// INITIALIZATION COMPLETE
// ===================================

console.log('Detective Noir - Game Initialized');
console.log('Use P (pause), M (mute), C (clue), T (toolbox), S (skip) for keyboard shortcuts');