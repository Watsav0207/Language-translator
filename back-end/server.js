const express = require("express");
const path = require("path");
const { exec } = require("child_process");
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { stringify } = require("querystring");

const app = express();
const PORT = 8081;

let count = 1

const limiter = rateLimit({
 	windowMs: 1 * 60 * 1000,
	max: 100,
    message: "Please try again later! Too many requests."
});

app.use(limiter);

app.use(compression());

app.use(express.static(path.resolve(__dirname, "../front-end")));

app.get("/home",(req, res) => {
    var ipAdrr = req.socket.remoteAddress === "::1" ? "127.0.0.1" : req.socket.remotePort
    count += 1
    console.log("User Connected:",ipAdrr, req.socket.remotePort)
    res.sendFile(path.resolve(__dirname, "../front-end/index.html"));
});


app.get("/login", (req, res) =>{

    res.sendFile(path.resolve(__dirname, "../front-end/login.html"))

});

app.get("/count", (req,res)=>{
    res.send(`Number of requests: ${count}`);
});

app.listen(PORT, ()=>{
    console.log(`Server is running at http://localhost:${PORT}`);
});

