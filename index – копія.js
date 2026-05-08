const express = require('express');
const app = express();

app.use(express.json());

app.post('/message', (req, res) => {
    console.log('Incoming:', JSON.stringify(req.body, null, 2));

    const userMessage =
        req.body?.message ||
        req.body?.text ||
        req.body?.body ||
        'empty message';

    const response = {
        reply: `Echo: ${userMessage}`
    };

    res.json(response);
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Echo bot running on port ${PORT}`);
});