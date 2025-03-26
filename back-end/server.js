const express = require("express");
const path = require("path");
const { exec } = require("child_process");

const app = express();
const PORT = 8080;

app.use(express.static(path.resolve(__dirname, "../front-end")));

app.get("/home", (req, res) =>{
    var ipAdrr = req.socket.remoteAddress === "::1" ? "127.0.0.1" : req.socket.remotePort
    console.log("User Connected:",ipAdrr, req.socket.remotePort)
    res.sendFile(path.resolve(__dirname, "../front-end/index.html"));
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});


app.get("/py", (req,res) => {
    exec("python script.py", (error,stdout,stderr)=>{
        if(error){
            return res.status(500).send(`Error: ${error.message}`);
        }

        if(stderr){
            return res.status(500).send(`Error: ${stderr.message}`)
        }
        res.send(`<pre>${stdout}</pre>`);
    });
});

