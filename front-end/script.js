document.getElementById('text-input').addEventListener('input', function() {
    const text = this.value.trim();
    const wordCount = text ? text.split(/\s+/).length : 0;
    const wordCountEl = document.querySelector('.language-label .word-count');
    if (wordCountEl) {
        wordCountEl.textContent = `${wordCount} words`;
    }
});

document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', function(e){
        e.preventDefault();
        const targetId = this.getAttribute('href').substring(1);
        
        document.querySelectorAll('.section-container').forEach(section => {
            section.classList.add('hidden');
        });
        
        if (targetId) {
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.remove('hidden');
            }
        }
    });
});

document.getElementById('historyBtn')?.addEventListener('click', function() {
    document.querySelectorAll('.section-container').forEach(section => {
        section.classList.add('hidden');
    });
    
    document.getElementById('history-section')?.classList.remove('hidden');
    
    const historyList = document.getElementById('history-list');
    if (historyList) {
        historyList.innerHTML = `
            <div class="translation-card">
                <p class="translation-english">Hello, how are you?</p>
                <p class="translation-telugu">హలో, మీరు ఎలా ఉన్నారు?</p>
                <p class="translation-time">2 minutes ago</p>
            </div>
            <div class="translation-card">
                <p class="translation-english">Thank you very much</p>
                <p class="translation
