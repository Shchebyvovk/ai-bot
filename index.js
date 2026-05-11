const express = require('express');
const app = express();

app.use(express.json());

// 🔥 LOG ALL REQUESTS (метод + шлях)
app.use((req, res, next) => {
    console.info(`➡️ ${req.method} ${req.url}`);
    next();
});

const { OpenAI } = require('openai');

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// 🔥 memory
const sessions = {};

// 🔥 decision logic
function shouldEscalate(message, reply) {

    if (!reply) return true;

    const text = (message || "").toLowerCase();

    const strictTriggers = [
        "refund",
        "legal",
        "chargeback",
        "human agent",
        "transfer to human",
        
    ];

    if (strictTriggers.some(t => text.includes(t))) {
        return true;
    }

    return false;
}

app.post('/message', async (req, res) => {

    // 🔥 LOG BODY
    console.info("📩 BODY:", JSON.stringify(req.body));

    const { message, convId } = req.body;

    // 🔥 SAFETY LOG
    console.info("🧠 Parsed:", { message, convId });

    if (!sessions[convId]) {
        sessions[convId] = [];
    }

    sessions[convId].push({
        role: "user",
        content: message
    });

    try {

        console.info("🤖 Sending to GPT:", sessions[convId]);

        const completion = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: sessions[convId]
        });

        const reply = completion.choices[0].message.content;

        console.info("✅ GPT reply:", reply);

        sessions[convId].push({
            role: "assistant",
            content: reply
        });

        const handoff = shouldEscalate(message, reply);

        console.info("🔁 Handoff decision:", handoff);

        res.json({
            reply,
            handoff
        });

    } catch (err) {

        console.error("❌ GPT ERROR:", err?.message || err);

        res.json({
            reply: "AI error",
            handoff: true
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("🚀 AI agent running on port", PORT);
});