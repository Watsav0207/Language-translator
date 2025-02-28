const express = require('express');
const path = require('path');
const bodyParser = require("body-parser");

const app = express()
const PORT = 8080;
    
app.use(bodyParser.json());

app.use(express.static(__dirname));

app.get("/home", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, ()=> console.log("Server is listening on http://localhost:8080"));


