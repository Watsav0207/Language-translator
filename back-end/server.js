const express = require("express");
const path = require("path");

const app = express();
const PORT = 8080;

app.use(express.static(path.resolve(__dirname, "../front-end")));

app.get("/home", (req, res) => {
    res.sendFile(path.resolve(__dirname, "../front-end/index.html"));
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
