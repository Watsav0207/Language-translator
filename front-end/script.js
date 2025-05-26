if (window.location.origin.includes('your-render-app.onrender.com')) {
  const originalFetch = window.fetch;
  window.fetch = function(url, options) {
    if (typeof url === 'string' && url.startsWith('/')) {
      url = window.location.origin + url;
    }
    return originalFetch(url, options);
  };
}

// Helper function to show loading state
function showLoading(isLoading) {
  const button = document.getElementById("translate-btn");
  const translatedTextElement = document.getElementById("translated-text");
  
  if (isLoading) {
    button.textContent = "Translating...";
    button.disabled = true;
    translatedTextElement.value = "Translating...";
  } else {
    button.textContent = "Translate";
    button.disabled = false;
  }
}

// Helper function to display translation
function displayTranslation(original, translated) {
  document.getElementById("text-input").value = original;
  document.getElementById("translated-text").value = translated;
}

// Helper function to show errors
function showError(message) {
  const translatedTextElement = document.getElementById("translated-text");
  translatedTextElement.value = `Error: ${message}`;
  
  // Also show an alert for better user feedback
  alert(message);
}

// Helper function to check if user is logged in
function getCookie(name) {
  const cookies = document.cookie.split(';').map(c => c.trim());
  for (const cookie of cookies) {
    if (cookie.startsWith(name + '=')) {
      return cookie.substring(name.length + 1);
    }
  }
  return null;
}

function isUserLoggedIn() {
  const sessionCookie = getCookie('connect.sid');
  return sessionCookie !== null && sessionCookie !== '';
}

// Helper function to save translation to history
async function saveTranslationToHistory(original, translated) {
  try {
    await fetch('/save-translation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ english: original, telugu: translated })
    });
  } catch (error) {
    console.error('Error saving translation to history:', error);
  }
}

// Translation service functions
async function translateWithLibreTranslate(text) {
  const response = await fetch("https://libretranslate.de/translate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ 
      q: text,
      source: "en",
      target: "te",
      format: "text"
    }),
  });
  
  if (!response.ok) {
    throw new Error(`LibreTranslate error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.translatedText;
}

async function translateWithMyMemory(text) {
  const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|te`);
  
  if (!response.ok) {
    throw new Error(`MyMemory error: ${response.status}`);
  }
  
  const data = await response.json();
  if (data.responseStatus === 200) {
    return data.responseData.translatedText;
  } else {
    throw new Error("MyMemory translation failed");
  }
}

async function translateWithLinguee(text) {
  try {
    // Using a public translation API
    const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=te&dt=t&q=${encodeURIComponent(text)}`);
    
    if (!response.ok) {
      throw new Error(`Google Translate error: ${response.status}`);
    }
    
    const data = await response.json();
    return data[0][0][0];
  } catch (error) {
    throw new Error("Google Translate service unavailable");
  }
}

// Fallback translation function using simple word mapping
function getFallbackTranslation(text) {
  const basicTranslations = {
    'hello': 'హలో',
    'hi': 'హాయ్',
    'good morning': 'శుభోదయం',
    'good evening': 'శుభ సాయంత్రం',
    'good night': 'శుభ రాత్రి',
    'thank you': 'ధన్యవాదాలు',
    'thanks': 'ధన్యవాదాలు',
    'please': 'దయచేసి',
    'sorry': 'క్షమించండి',
    'yes': 'అవును',
    'no': 'లేదు',
    'water': 'నీరు',
    'food': 'ఆహారం',
    'house': 'ఇల్లు',
    'family': 'కుటుంబం',
    'friend': 'మిత్రుడు',
    'love': 'ప్రేమ',
    'time': 'సమయం',
    'day': 'రోజు',
    'night': 'రాత్రి',
    'sun': 'సూర్యుడు',
    'moon': 'చంద్రుడు',
    'book': 'పుస్తకం',
    'school': 'పాఠశాల',
    'work': 'పని',
    'money': 'డబ్బు',
    'happy': 'సంతోషంగా',
    'sad': 'దుఃఖంగా',
    'good': 'మంచి',
    'bad': 'చెడు',
    'big': 'పెద్ద',
    'small': 'చిన్న',
    'hot': 'వేడిమిగా',
    'cold': 'చల్లగా'
  };
  
  const lowerText = text.toLowerCase().trim();
  
  // Check for exact matches
  if (basicTranslations[lowerText]) {
    return basicTranslations[lowerText];
  }
  
  // Check for partial matches
  for (const [english, telugu] of Object.entries(basicTranslations)) {
    if (lowerText.includes(english)) {
      return `${telugu} (partial translation)`;
    }
  }
  
  return `${text} (translation not available - please try a different service)`;
}

// Main translation function with multiple fallbacks
async function startTranslation() {
  const inputText = document.getElementById("text-input").value.trim();

  if (!inputText) {
    document.getElementById("translated-text").value = "";
    return;
  }

  try {
    // Show loading state
    showLoading(true);
    
    let translatedText = null;
    let serviceUsed = "";
    
    // Try LibreTranslate first
    try {
      translatedText = await translateWithLibreTranslate(inputText);
      serviceUsed = "LibreTranslate";
    } catch (error) {
      console.log("LibreTranslate failed:", error.message);
    }
    
    // If LibreTranslate fails, try MyMemory
    if (!translatedText) {
      try {
        translatedText = await translateWithMyMemory(inputText);
        serviceUsed = "MyMemory";
      } catch (error) {
        console.log("MyMemory failed:", error.message);
      }
    }
    
    // If MyMemory fails, try Google Translate
    if (!translatedText) {
      try {
        translatedText = await translateWithLinguee(inputText);
        serviceUsed = "Google Translate";
      } catch (error) {
        console.log("Google Translate failed:", error.message);
      }
    }
    
    // If all services fail, use fallback translation
    if (!translatedText) {
      translatedText = getFallbackTranslation(inputText);
      serviceUsed = "Offline Dictionary";
    }
    
    // Display the translation
    displayTranslation(inputText, translatedText);
    
    // Show which service was used (optional - you can remove this)
    console.log(`Translation provided by: ${serviceUsed}`);
    
    // Save to user's history (if logged in) - only save if it's a real translation
    if (isUserLoggedIn() && !translatedText.includes("translation not available")) {
      await saveTranslationToHistory(inputText, translatedText);
    }
    
  } catch (error) {
    // Final fallback if everything fails
    console.error("All translation methods failed:", error);
    const fallbackTranslation = getFallbackTranslation(inputText);
    displayTranslation(inputText, fallbackTranslation);
  } finally {
    showLoading(false);
  }
}

function validateLogin() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorMsg = document.getElementById("error-msg");

  if (!username || !password) {
    errorMsg.textContent = "Both fields are required.";
    return false;
  }

  fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  })
    .then(res => {
      if (res.ok) return res.json();
      return res.json().then(data => { throw new Error(data.message); });
    })
    .then(() => {
      window.location.href = "/home";
    })
    .catch(err => {
      errorMsg.textContent = err.message || "Login failed.";
    });

  return false;
}

function validateSignup() {
  const username = document.getElementById("new-username").value.trim();
  const password = document.getElementById("new-password").value.trim();
  const errorMsg = document.getElementById("signup-error-msg");

  if (!username || !password) {
    errorMsg.textContent = "Both fields are required to sign up.";
    return false;
  }

  if (username.length < 6 || username.length > 15) {
    errorMsg.textContent = "Username length should be between 6 and 15";
    return false;
  }

  const isValidPassword = /^(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,16}$/.test(password);

  if (!isValidPassword) {
    errorMsg.textContent = "Password must be 8-16 characters long, include a number and a special character.";
    return false;
  }

  fetch("/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  })
    .then(res => {
      if (res.ok) return res.json();
      return res.json().then(data => { throw new Error(data.message); });
    })
    .then(() => {
      const successMsg = document.createElement("div");
      successMsg.classList.add("success-message", "success");
      successMsg.textContent = "Account created! Redirecting to login...";
      document.querySelector(".login-container").appendChild(successMsg);
      setTimeout(() => window.location.href = "/login", 2000);
    })
    .catch(err => {
      errorMsg.textContent = err.message || "Signup failed.";
    });

  return false;
}

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

function initializeTheme() {
  const themeToggle = document.createElement('button');
  themeToggle.className = 'theme-toggle';
  themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
  themeToggle.id = 'theme-toggle';

  const header = document.querySelector('.page-header');
  if (header) {
    header.appendChild(themeToggle);

    const currentTheme = localStorage.getItem('theme') || 'dark';
    if (currentTheme === 'light') {
      document.body.classList.add('light-theme');
      themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }

    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('light-theme');
      const isLight = document.body.classList.contains('light-theme');
      localStorage.setItem('theme', isLight ? 'light' : 'dark');
      themeToggle.innerHTML = isLight ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    });
  }
}

function saveTranslation(english, telugu) {
  fetch('/save-translation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ english, telugu })
  })
    .catch(error => {
      console.error('Error saving translation:', error);
    });
}

function saveCurrentTranslation() {
  const english = document.getElementById('text-input').value.trim();
  const telugu = document.getElementById('translated-text').value.trim();

  if (!english || !telugu || telugu === "Translating..." || telugu.includes("Error:") || telugu === "Translation failed") {
    alert("Please translate something first before saving");
    return;
  }

  fetch('/save-to-saved', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ english, telugu })
  })
  .then(response => response.json())
  .then(data => {
    if (data.message === "Translation saved to saved list") {
      alert("Translation saved successfully!");
    } else {
      alert(data.message || "Error saving translation");
    }
  })
  .catch(error => {
    console.error('Error saving translation:', error);
    alert("Error saving translation");
  });
}

function showTranslationHistory() {
  const historyModal = document.getElementById('history-modal');
  historyModal.style.display = 'block';

  fetch('/history')
    .then(response => response.json())
    .then(data => {
      const historyList = document.getElementById('history-list');
      historyList.innerHTML = '';

      if (data.translations && data.translations.length > 0) {
        data.translations.forEach((item, index) => {
          const historyItem = document.createElement('li');
          historyItem.className = 'history-item';
          historyItem.innerHTML = `
            <div class="history-entry">
              <p><strong>English:</strong> ${item.english}</p>
              <p><strong>Telugu:</strong> ${item.telugu}</p>
            </div>
            <div class="history-actions">
              <button class="use-btn" data-index="${index}">Use</button>
              <button class="delete-btn" data-index="${index}">Delete</button>
            </div>
          `;
          historyList.appendChild(historyItem);

          historyItem.querySelector('.use-btn').addEventListener('click', () => {
            document.getElementById('text-input').value = item.english;
            document.getElementById('translated-text').value = item.telugu;
            historyModal.style.display = 'none';
          });

          historyItem.querySelector('.delete-btn').addEventListener('click', () => {
            deleteHistoryItem(index);
          });
        });
      } else {
        historyList.innerHTML = '<li>No translation history found.</li>';
      }
    })
    .catch(error => {
      console.error('Error fetching history:', error);
      document.getElementById('history-list').innerHTML = '<li>Error loading translation history.</li>';
    });
}

function showSavedTranslations() {
  const savedModal = document.getElementById('saved-modal');
  savedModal.style.display = 'block';

  fetch('/saved-translations')
    .then(response => response.json())
    .then(data => {
      const savedList = document.getElementById('saved-list');
      savedList.innerHTML = '';

      if (data.savedTranslations && data.savedTranslations.length > 0) {
        data.savedTranslations.forEach((item, index) => {
          const savedItem = document.createElement('li');
          savedItem.className = 'saved-item';
          savedItem.innerHTML = `
            <div class="saved-entry">
              <p><strong>English:</strong> ${item.english}</p>
              <p><strong>Telugu:</strong> ${item.telugu}</p>
            </div>
            <div class="saved-actions">
              <button class="use-btn" data-index="${index}">Use</button>
              <button class="delete-btn" data-index="${index}">Delete</button>
            </div>
          `;
          savedList.appendChild(savedItem);

          savedItem.querySelector('.use-btn').addEventListener('click', () => {
            document.getElementById('text-input').value = item.english;
            document.getElementById('translated-text').value = item.telugu;
            savedModal.style.display = 'none';
          });

          savedItem.querySelector('.delete-btn').addEventListener('click', () => {
            deleteSavedItem(index);
          });
        });
      } else {
        savedList.innerHTML = '<li>No saved translations found.</li>';
      }
    })
    .catch(error => {
      console.error('Error fetching saved translations:', error);
      document.getElementById('saved-list').innerHTML = '<li>Error loading saved translations.</li>';
    });
}

function deleteHistoryItem(index) {
  fetch('/delete-history-item', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ index })
  })
    .then(response => response.json())
    .then(data => {
      if (data.message === "History item deleted successfully") {
        showTranslationHistory();
      } else {
        alert("Error deleting history item");
      }
    })
    .catch(error => {
      console.error('Error deleting history item:', error);
      alert("Error deleting history item");
    });
}

function deleteSavedItem(index) {
  fetch('/delete-saved-item', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ index })
  })
    .then(response => response.json())
    .then(data => {
      if (data.message === "Saved item deleted successfully") {
        showSavedTranslations();
      } else {
        alert("Error deleting saved item");
      }
    })
    .catch(error => {
      console.error('Error deleting saved item:', error);
      alert("Error deleting saved item");
    });
}

function deleteAllHistory() {
  if (!confirm("Are you sure you want to delete all history?")) return;

  fetch('/delete-history', { method: "DELETE" })
    .then(response => response.json())
    .then(data => {
      if (data.message === "History deleted successfully") {
        document.getElementById("history-list").innerHTML = "";
        document.getElementById("history-modal").style.display = "none";
      }
    })
    .catch(error => {
      console.error("Error deleting history:", error);
    });
}

function deleteAllSaved() {
  if (!confirm("Are you sure you want to delete all saved translations?")) return;

  fetch('/delete-saved', { method: "DELETE" })
    .then(response => response.json())
    .then(data => {
      if (data.message === "Saved translations deleted successfully") {
        document.getElementById("saved-list").innerHTML = "";
        document.getElementById("saved-modal").style.display = "none";
      }
    })
    .catch(error => {
      console.error("Error deleting saved translations:", error);
    });
}

document.addEventListener('DOMContentLoaded', () => {
  initializeTheme();

  document.getElementById("translate-btn")?.addEventListener("click", startTranslation);

  document.getElementById("copy-btn")?.addEventListener("click", () => {
    const translatedText = document.getElementById("translated-text");
    translatedText.select();
    document.execCommand("copy");
  });

  document.getElementById("bookmark-btn")?.addEventListener("click", saveCurrentTranslation);

  fetch("/current-user")
    .then((response) => response.json())
    .then((data) => {
      if (data.username) {
        document.getElementById("username-display").textContent = `Hello, ${data.username}`;
      } else {
        document.getElementById("username-display").textContent = "Hello, Guest";
      }
    })
    .catch((error) => {
      console.error("Error fetching user info:", error);
    });

  document.getElementById("logout-btn")?.addEventListener("click", () => {
    fetch("/logout", { method: "POST" })
      .then((response) => response.json())
      .then((data) => {
        if (data.message === "Logged out successfully") {
          window.location.href = "/login";
        }
      })
      .catch((error) => {
        console.error("Error logging out:", error);
      });
  });

  document.getElementById("history-btn")?.addEventListener("click", showTranslationHistory);
  document.getElementById("saved-btn")?.addEventListener("click", showSavedTranslations);

  document.getElementById("delete-history-btn")?.addEventListener("click", deleteAllHistory);
  document.getElementById("delete-saved-btn")?.addEventListener("click", deleteAllSaved);

  document.getElementById("close-history")?.addEventListener("click", () => {
    document.getElementById("history-modal").style.display = "none";
  });

  document.getElementById("close-saved")?.addEventListener("click", () => {
    document.getElementById("saved-modal").style.display = "none";
  });

  window.addEventListener("click", (event) => {
    if (event.target === document.getElementById("history-modal")) {
      document.getElementById("history-modal").style.display = "none";
    }
    if (event.target === document.getElementById("saved-modal")) {
      document.getElementById("saved-modal").style.display = "none";
    }
  });
});