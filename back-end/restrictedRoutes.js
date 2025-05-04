const express = require('express');
const path = require('path');
const router = express.Router();

const forbiddenPagePath = path.join(__dirname, '../front-end/forbidden.html');


router.get('/index.html', (req, res) => {
  res.status(403).sendFile(forbiddenPagePath);
});

router.get('/login.html', (req, res) => {
  res.status(403).sendFile(forbiddenPagePath);
});

module.exports = router;
