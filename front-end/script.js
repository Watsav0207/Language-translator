// Word count functionality
document.getElementById('text-input').addEventListener('input', function() {
    const text = this.value.trim();
    const wordCount = text ? text.split(/\s+/).length : 0;
    document.querySelector('.language-label .word-count').textContent = `${wordCount} words`;
});

// Navigation functionality
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href').substring(1);
        
        // Hide all sections first
        document.querySelectorAll('.section-container').forEach(section => {
            section.classList.add('hidden');
        });
        
        // Show the target section if it exists
        if (targetId) {
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.remove('hidden');
            }
        }
    });
});

// History button functionality
document.getElementById('historyBtn').addEventListener('click', function() {
    // Hide all sections first
    document.querySelectorAll('.section-container').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show history section
    document.getElementById('history-section').classList.remove('hidden');
    
    // Load history (in a real app, this would come from storage)
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = `
        <div class="translation-card">
            <p class="translation-english">Hello, how are you?</p>
            <p class="translation-telugu">హలో, మీరు ఎలా ఉన్నారు?</p>
            <p class="translation-time">2 minutes ago</p>
        </div>
        <div class="translation-card">
            <p class="translation-english">Thank you very much</p>
            <p class="translation-telugu">చాలా ధన్యవాదాలు</p>
            <p class="translation-time">5 minutes ago</p>
        </div>
        <div class="translation-card">
            <p class="translation-english">Where is the railway station?</p>
            <p class="translation-telugu">రైల్వే స్టేషన్ ఎక్కడ ఉంది?</p>
            <p class="translation-time">10 minutes ago</p>
        </div>
    `;
});

// Footer modal functionality
document.querySelectorAll('.footer-right a').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const modalId = this.getAttribute('href').substring(1);
        document.getElementById(modalId).classList.add('active');
    });
});

// Close modal functionality
document.querySelectorAll('.close-modal').forEach(button => {
    button.addEventListener('click', function() {
        this.closest('.footer-modal').classList.remove('active');
    });
});

// Feedback form submission
document.getElementById('feedback-form').addEventListener('submit', function(e) {
    e.preventDefault();
    alert('Thank you for your feedback!');
    this.reset();
    document.getElementById('feedback').classList.remove('active');
});

// Translation function
function startTranslation() {
    const inputText = document.getElementById('text-input').value;
    if (!inputText.trim()) return;
    
    // This is just a placeholder - in a real app you would call a translation API
    const translations = {
        "hello": "హలో",
        "thank you": "ధన్యవాదాలు",
        "good morning": "శుభోదయం",
        "how are you": "మీరు ఎలా ఉన్నారు?",
        "what is your name": "మీ పేరు ఏమిటి?",
        "i love telugu": "నేను తెలుగును ప్రేమిస్తున్నాను",
        "where is the bathroom": "బాత్రూమ్ ఎక్కడ ఉంది?",
        "please": "దయచేసి",
        "sorry": "క్షమించండి",
        "good night": "శుభ రాత్రి"
    };
    
    // Simple word-by-word translation for demo
    let translatedText = inputText.toLowerCase();
    for (const [eng, tel] of Object.entries(translations)) {
        translatedText = translatedText.replace(new RegExp(eng, 'gi'), tel);
    }
    
    // If no translation found, show a placeholder
    if (translatedText === inputText.toLowerCase()) {
        translatedText = "This is where the Telugu translation would appear";
    }
    
    document.getElementById('translated-text').value = translatedText;
    
    // Add to history (in a real app, this would be saved to storage)
    const historyItem = document.createElement('div');
    historyItem.className = 'translation-card';
    historyItem.innerHTML = `
        <p class="translation-english">${inputText}</p>
        <p class="translation-telugu">${translatedText}</p>
        <p class="translation-time">Just now</p>
    `;
    document.getElementById('history-list').prepend(historyItem);
}
