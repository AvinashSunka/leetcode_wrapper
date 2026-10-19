const express = require('express');
const path = require('path');
const router = require('./src/routes');
const { PORT } = require('./src/config');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(router);

app.listen(PORT, () => {
    console.log(`LeetCode microservice is running on http://localhost:${PORT}`);
});
