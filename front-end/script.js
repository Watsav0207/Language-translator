function translateText() {
    const textInput = document.getElementById("text-input").value;

    if (!textInput) {
        alert("Please enter text to translate!");
        return;
    }

    setTimeout(() => {
        document.getElementById("translated-text").value = "Still Working on it :P";
    }, 1000);
}


