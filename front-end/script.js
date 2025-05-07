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

  if(username.length < 6 || username.length > 15){
    errorMsg.textContent = "Username length should be between 6 and 15";
    return false;
  }

  const isValidPassword = /^(?=.[0-9])(?=.[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,16}$/.test(password);

  if(!isValidPassword) {
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
      successMsg.classList.add("success-message");
      successMsg.textContent = "Account created! Redirecting to login...";
      successMsg.classList.add("success");
      document.querySelector(".login-container").appendChild(successMsg);
      setTimeout(() => window.location.href = "/login", 2000);
    })
    .catch(err => {
      errorMsg.textContent = err.message || "Signup failed.";
    });

  return false;
}

// eye icon to show or hide the password
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

document.addEventListener('DOMContentLoaded', initializeTheme);

// func to call when user hits on translate button
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

function showTranslationHistory() {
  let historyModal = document.getElementById('history-modal');
  
  if (!historyModal) {
    historyModal = document.createElement('div');
    historyModal.id = 'history-modal';
    historyModal.className = 'modal';
    
    historyModal.innerHTML = `
      <div class="modal-content">
        <span class="close-btn">&times;</span>
        <h2>Translation History</h2>
        <div id="history-list"></div>
      </div>
    `;
    
    document.body.appendChild(historyModal);
    
    historyModal.querySelector('.close-btn').addEventListener('click', () => {
      historyModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
      if (event.target === historyModal) {
        historyModal.style.display = 'none';
      }
    });
  }

  fetch('/history')
    .then(response => response.json())
    .then(data => {
      const historyList = document.getElementById('history-list');
      historyList.innerHTML = '';
      
      if (data.translations && data.translations.length > 0) {
        data.translations.forEach((item, index) => {
          const historyItem = document.createElement('div');
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
            deleteHistory(index);
          });
        });
      } else {
        historyList.innerHTML = '<p>No translation history found.</p>';
      }
    })
    .catch(error => {
      console.error('Error fetching history:', error);
      document.getElementById('history-list').innerHTML = '<p>Error loading translation history.</p>';
    });
  
  historyModal.style.display = 'block';
}

function deleteHistory(index) {
  fetch('/delete-history', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ index })
  })
    .then(res => res.json())
    .then(data => {
      if (data.message === "Item deleted successfully.") {
        alert("History item deleted!");
        showTranslationHistory();
      } else {
        alert("Error deleting history.");
      }
    })
    .catch(error => {
      console.error('Error deleting history:', error);
      alert("Error deleting history.");
    });
}

document.addEventListener('DOMContentLoaded', () => {
  const historyBtn = document.querySelector('.nav-btn:nth-child(2)');
  if (historyBtn) {
    historyBtn.addEventListener('click', showTranslationHistory);
  }
  
  const translateBtn = document.getElementById('translate-btn');
  if (translateBtn) {

    const oldHandler = translateBtn.onclick;
    translateBtn.onclick = function() {
      if (oldHandler) {
        oldHandler.call(this);
      } else {
        startTranslation();
      }

      setTimeout(() => {
        const english = document.getElementById('text-input').value;
        const telugu = document.getElementById('translated-text').value;
        
        if (english && telugu) {
          saveTranslation(english, telugu);
        }
      }, 1000);
    };
  }
});