// ==================== AUTH FUNCTIONS ====================

// Login validation
function validateLogin() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorMsg = document.getElementById("error-msg");

  if (!username || !password) {
    errorMsg.textContent = "Both fields are required.";
    return false;
  }

  window.location.href = "index.html";
  return false;
}

// Sign-up validation
function validateSignup() {
  const username = document.getElementById("new-username").value.trim();
  const password = document.getElementById("new-password").value.trim();
  const errorMsg = document.getElementById("signup-error-msg");

  if (!username || !password) {
    errorMsg.textContent = "Both fields are required to sign up.";
    return false;
  }

  alert("Account created! You can now log in.");
  window.location.href = "login.html";
  return false;
}

// Toggle password visibility
function togglePassword(inputId = "password", iconContainer = null) {
  const passwordField = document.getElementById(inputId);
  const icon = iconContainer ? iconContainer.querySelector("i") : document.querySelector(".toggle-password i");

  if (passwordField.type === "password") {
    passwordField.type = "text";
    icon.className = "fas fa-eye-slash";
  } else {
    passwordField.type = "password";
    icon.className = "fas fa-eye";
  }
}

// ==================== TRANSLATOR CORE ====================

function startTranslation() {
  const englishText = document.getElementById('text-input').value.trim();
  if (!englishText) return;

  const teluguTranslation = "అనువాదం ఇక్కడ కనిపిస్తుంది...";
  typeWriterEffect(teluguTranslation);
}

function typeWriterEffect(text) {
  const output = document.getElementById('translated-text');
  if (!output) return;

  output.value = '';
  let i = 0;
  const speed = 50;

  function type() {
    if (i < text.length) {
      output.value += text.charAt(i);
      i++;
      setTimeout(type, speed);
    }
  }

  type();
}

// ==================== UI + NAVIGATION ====================

document.addEventListener('DOMContentLoaded', function() {
  // Nav button highlight
  const navButtons = document.querySelectorAll('.nav-btn');
  navButtons.forEach(button => {
    button.addEventListener('click', function() {
      navButtons.forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
    });
  });

  // Word counter for translation input
  const textInput = document.getElementById('text-input');
  if (textInput) {
    textInput.addEventListener('input', function() {
      const text = this.value.trim();
      const wordCount = text ? text.split(/\s+/).length : 0;
      const wordCountEl = document.querySelector('.language-label .word-count');
      if (wordCountEl) wordCountEl.textContent = `${wordCount} words`;
    });
  }

  // Placeholder for translation history
  const historyBtn = document.querySelector('.nav-btn:nth-child(2)');
  if (historyBtn) {
    historyBtn.addEventListener('click', function() {
      console.log('History button clicked');
    });
  }
});
