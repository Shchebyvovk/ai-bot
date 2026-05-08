const express = require('express');
const app = express();
app.use(express.json());

const sessions = {};

const { OpenAI } = require('openai');
const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

app.post('/message', async (req, res) => {

    const { message, convId } = req.body;

    if (!sessions[convId]) {
        sessions[convId] = [];
    }

    sessions[convId].push({
        role: "user",
        content: message
    });

    // 🔥 GPT виклик
    const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: sessions[convId]
    });

    const reply = completion.choices[0].message.content;

    sessions[convId].push({
        role: "assistant",
        content: reply
    });

    res.json({
        reply: reply
    });
});

app.listen(3000, () => console.log("AI agent running"));