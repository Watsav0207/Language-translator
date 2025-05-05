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

function Translate(){

}

function validateSignup() {
  const username = document.getElementById("new-username").value.trim();
  const password = document.getElementById("new-password").value.trim();
  const errorMsg = document.getElementById("signup-error-msg");

  if (!username || !password) {
    errorMsg.textContent = "Both fields are required to sign up.";
    return false;
  }

  if(username.length < 6 && username.length > 15){
    errorMsg.textContent = "Username length should be between 6 and 15";
    return false;
  }

  const isValidPassword = /^(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,16}$/.test(password);

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

function logout() {
  fetch("/logout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  })
    .then(() => {
      window.location.href = "/login";
    })
    .catch(err => console.error("Logout failed:", err));
}

//eye icon to show or hide the password
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
