const express = require('express');
const app = express();

app.use(express.json());

const { OpenAI } = require('openai');

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// 🔥 In-memory conversation memory
const sessions = {};

// 🔥 System prompt
const SYSTEM_PROMPT = `
You are an expert technical support AI assistant.

You specialize in:
- Live Assist for Dynamics 365
- LivePerson integrations
- LivePerson Functions
- Messaging routing
- Agent transfer flows
- Bot integrations
- Omnichannel support
- CRM integrations

Your role is to behave like a senior support engineer.

Rules:
- Be concise but helpful
- Give technical explanations when needed
- Never invent unsupported features
- If unsure, admit uncertainty
- Never say you cannot transfer to a human
- If user needs escalation, backend access, billing help, or asks for a human, allow escalation
`;

// 🔥 AI-based escalation detection
async function detectEscalation(message) {

    try {

        const escalationCheck = await client.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: `
You are an escalation detection system.

Analyze the user message.

Return ONLY valid JSON:

{
  "handoff": true/false,
  "reason": "short reason"
}

Escalate if:
- user asks for human/agent
- refund/billing/payment issue
- legal/compliance issue
- user is angry/frustrated
- backend access required
- high-risk request
- repeated failed troubleshooting
`
                },
                {
                    role: "user",
                    content: message
                }
            ]
        });

        const result = JSON.parse(
            escalationCheck.choices[0].message.content
        );

        return result;

    } catch (err) {

        console.error("Escalation detection failed:", err);

        return {
            handoff: false,
            reason: "fallback"
        };
    }
}

// 🔥 Welcome message
function isWelcomeMessage(message) {

    if (!message) return true;

    const text = message.toLowerCase().trim();

    return (
        text === "hi" ||
        text === "hello" ||
        text === "start" ||
        text === "welcome"
    );
}

// 🔥 Main endpoint
app.post('/message', async (req, res) => {

    try {

        const { message, convId } = req.body;

        console.info("Incoming message:", message);
        console.info("Conversation ID:", convId);

        // 🔥 Welcome flow
        if (isWelcomeMessage(message)) {

            return res.json({
                reply:
                    "Hello! I’m your AI support assistant for Live Assist and LivePerson integrations. I’ve been trained on Live Assist and LivePerson documentation and I’m ready to help with technical support questions.",
                handoff: false
            });
        }

        // 🔥 Create session
        if (!sessions[convId]) {
            sessions[convId] = [];
        }

        // 🔥 Store user message
        sessions[convId].push({
            role: "user",
            content: message
        });

        // 🔥 Detect escalation
        const escalation = await detectEscalation(message);

        console.info("Escalation result:", escalation);

        // 🔥 GPT response
        const completion = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: SYSTEM_PROMPT
                },
                ...sessions[convId]
            ]
        });

        const reply =
            completion.choices[0].message.content;

        // 🔥 Store AI reply
        sessions[convId].push({
            role: "assistant",
            content: reply
        });

        // 🔥 Send response
        res.json({
            reply,
            handoff: escalation.handoff,
            reason: escalation.reason
        });

    } catch (err) {

        console.error("AI SERVER ERROR:", err);

        res.json({
            reply:
                "I encountered a temporary issue. Let me connect you to a human agent.",
            handoff: true,
            reason: "server_error"
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("AI support agent running on port", PORT);
});