(async function () {
    // Load JSON data
    async function loadLexicon() {
        try {
            const response = await fetch('GuiaLexicologia.json');
            if (!response.ok) throw new Error('Failed to load GuiaLexicologia.json');
            const data = await response.json();
            localStorage.setItem('lexicon', JSON.stringify(data));
            return data;
        } catch (error) {
            console.error('Error loading JSON:', error);
            alert('No se pudo cargar el diccionario. Intenta de nuevo.');
            return [];
        }
    }

    // Initialize variables
    const words = await loadLexicon();
    if (!words.length) return; // Exit if JSON loading failed

    let currentWord = null;
    let history = [];
    let corrects = 0;
    let incorrects = 0;
    let totalAnswers = 0;

    // Create a Map for faster word lookup
    const lexiconMap = new Map(words.map(w => [w.Palabra, w.sinonimo]));

    // Filter words with single and multiple synonyms
    const singleSynonymWords = words.filter(w =>
        (w.num >= 9 && w.num <= 19) || (w.num >= 94.1 && w.num <= 94.96)
    ).filter(w => w.sinonimo.length === 1);
    
    const multiSynonymWords = words.filter(w => w.sinonimo.length > 1);

    // Get a random word
    function getRandomWord() {
        return words[Math.floor(Math.random() * words.length)];
    }

    // Generate random answer options
    function getRandomOptions(correctSynonyms) {
        const correctOption = correctSynonyms[Math.floor(Math.random() * correctSynonyms.length)];
        const options = new Set([correctOption]);

        if (correctSynonyms.length === 1) {
            // For single-synonym words, use other single-synonym words
            const availableOptions = singleSynonymWords.filter(
                w => w.Palabra !== currentWord.Palabra && !w.sinonimo.includes(correctOption)
            );
            while (options.size < 4 && availableOptions.length > 0) {
                const randomIndex = Math.floor(Math.random() * availableOptions.length);
                const randomSynonym = availableOptions[randomIndex].sinonimo[0];
                options.add(randomSynonym);
                availableOptions.splice(randomIndex, 1);
            }
        } else {
            // For multi-synonym words, use other multi-synonym words
            const allMultiSynonyms = multiSynonymWords.flatMap(w => w.sinonimo);
            while (options.size < 4) {
                const randomSynonym = allMultiSynonyms[Math.floor(Math.random() * allMultiSynonyms.length)];
                if (!correctSynonyms.includes(randomSynonym) && !options.has(randomSynonym)) {
                    options.add(randomSynonym);
                }
            }
        }

        // Convert Set to array and shuffle
        const shuffledOptions = [...options];
        for (let i = shuffledOptions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
        }
        return { options: shuffledOptions, correct: correctOption };
    }

    // Load a new exercise
    function loadExercise() {
        currentWord = getRandomWord();
        document.getElementById('word').textContent = currentWord.Palabra;
        const { options, correct } = getRandomOptions(currentWord.sinonimo);
        const optionsDiv = document.getElementById('options');
        optionsDiv.innerHTML = '';
        options.forEach(option => {
            const button = document.createElement('div');
            button.className = 'option';
            button.textContent = option;
            button.setAttribute('role', 'button');
            button.setAttribute('tabindex', '0');
            button.onclick = () => checkAnswer(option, correct);
            button.onkeydown = (e) => {
                if (e.key === 'Enter' || e.key === ' ') checkAnswer(option, correct);
            };
            optionsDiv.appendChild(button);
        });
    }

    // Check the selected answer
    function checkAnswer(selected, correctOption) {
        const options = document.querySelectorAll('.option');
        options.forEach(option => {
            option.onclick = null; // Disable further clicks
            option.onkeydown = null; // Disable further key presses
            if (option.textContent === correctOption) {
                option.classList.add('correct');
            }
            if (option.textContent === selected && selected !== correctOption) {
                option.classList.add('incorrect');
            }
        });


        history.push({
            word: currentWord.Palabra,
            selected: selected,
            wasCorrect: selected === correctOption
        })

        if (selected === correctOption) {
            corrects++;
            totalAnswers++;
            // Confetti animation
            const count = 200;
            const defaults = { origin: { y: 0.7 } };
            function fire(particleRatio, opts) {
                confetti({
                    ...defaults,
                    ...opts,
                    particleCount: Math.floor(count * particleRatio)
                });
            }
            fire(0.25, { spread: 26, startVelocity: 55 });
            fire(0.2, { spread: 60 });
            fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
            fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
            fire(0.1, { spread: 120, startVelocity: 45 });
        } else {
            incorrects++;
            totalAnswers++;
        }

        updateScore();
        updateHistory();
        setTimeout(loadExercise, 1200);
    }

    // Update score display
    function updateScore() {
        const percentElement = document.getElementById('porcentaje');
        const correctsElement = document.getElementById('correct');
        const incorrectsElement = document.getElementById('errors');

        const newPercent = totalAnswers > 0 ? (corrects / totalAnswers) * 100 : 0;
        let textColor = '#155724'; // Green for high percentage
        if (newPercent < 74) textColor = '#f0c40f'; // Yellow for medium
        if (newPercent < 60) textColor = '#b22230'; // Red for low

        // Update the conic gradient for the progress wheel
        percentElement.style.background = `conic-gradient(#155724 0% ${newPercent}%, #b22230 ${newPercent}% 100%, #e0e0e0 100% 100%)`;
        percentElement.innerHTML = `<span style="color: ${textColor}">${newPercent.toFixed(1)}%</span>`;
        correctsElement.textContent = corrects;
        incorrectsElement.textContent = incorrects;
    }

    // Update history display
    function updateHistory() {
        const historyList = document.getElementById('history-list');
        historyList.innerHTML = '';
        history.forEach(entry => {
            const li = document.createElement('li');
            li.textContent = `Palabra: ${entry.word} | Seleccionado: ${entry.selected} | ${entry.wasCorrect ? 'Correcto' : 'Incorrecto'}`;
            li.style.color = '#ffffff';
            li.style.backgroundColor = entry.wasCorrect ? '#155724' : '#721c24';
            li.style.borderRadius = '5px';
            li.style.paddingLeft = '10px';
            historyList.prepend(li);
        });
    }

    // Start the game
    loadExercise();
})();