const express = require('express');
const app = express();

app.use(express.json());

const { OpenAI } = require('openai');

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// 🔥 memory
const sessions = {};

// 🔥 decision logic
function shouldEscalate(message, reply) {

    if (!reply) return true;

    const text = message.toLowerCase();

    const strictTriggers = [
        "refund",
        "legal",
        "chargeback"
    ];

    if (strictTriggers.some(t => text.includes(t))) {
        return true;
    }

    return false;
}

app.post('/message', async (req, res) => {

    const { message, convId } = req.body;

    if (!sessions[convId]) {
        sessions[convId] = [];
    }

    sessions[convId].push({
        role: "user",
        content: message
    });

    try {

        const completion = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: sessions[convId]
        });

        const reply = completion.choices[0].message.content;

        sessions[convId].push({
            role: "assistant",
            content: reply
        });

        const handoff = shouldEscalate(message, reply);

        res.json({
            reply,
            handoff
        });

    } catch (err) {

        res.json({
            reply: "AI error",
            handoff: true
        });
    }
});

app.listen(3000, () => {
    console.log("AI agent running on port 3000");
});