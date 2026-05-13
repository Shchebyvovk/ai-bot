const express = require('express');
const app = express();

app.use(express.json());

const { OpenAI } = require('openai');

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// 🔥 Knowledge base
const KNOWLEDGE = require('./knowledge');

// 🔥 Conversation memory
const sessions = {};

// 🔥 System prompt
const SYSTEM_PROMPT = `
You are a technical support assistant for Live Assist for Dynamics 365.

Your job is to help users troubleshoot:
- Live Assist installation
- Dynamics 365 integration
- Omnichannel setup
- Chat widget behavior
- Agent routing
- Authentication issues
- Live Assist configuration
- Common deployment issues

Guidelines:
- Give direct and practical answers
- Focus on Live Assist behavior first
- Prefer troubleshooting steps over theory
- Ask follow-up questions only if necessary
- Keep answers concise and technical
- Do not provide generic AI advice
- Do not invent settings or features
- If unsure, say what should be verified

When troubleshooting:
1. Explain the most likely cause
2. Explain how to verify it
3. Suggest the fix

Keep responses short unless user asks for details.
`;

// 🔥 Escalation detection
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

Return ONLY valid JSON:

{
  "handoff": true/false,
  "reason": "short reason"
}

Escalate ONLY if:
- user explicitly asks for human
- refund/billing issue
- legal issue
- user extremely frustrated
- manual backend intervention required
`
                },
                {
                    role: "user",
                    content: message
                }
            ]
        });

        return JSON.parse(
            escalationCheck.choices[0].message.content
        );

    } catch (err) {

        console.error("Escalation detection failed:", err);

        return {
            handoff: false,
            reason: "fallback"
        };
    }
}

// 🔥 Welcome detection
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
                    "Hello! I’m your AI assistant for Live Assist for Dynamics 365. I can help troubleshoot configuration issues, routing problems, widget behavior, integrations, and other technical questions.",
                handoff: false
            });
        }

        // 🔥 Create session
        if (!sessions[convId]) {

            sessions[convId] = {
                messages: [],
                pendingTransfer: false
            };
        }

        // 🔥 Transfer confirmation flow
        const lower = message.toLowerCase();

        if (
            sessions[convId].pendingTransfer &&
            (
                lower.includes("yes") ||
                lower.includes("human") ||
                lower.includes("agent") ||
                lower.includes("transfer")
            )
        ) {

            return res.json({
                reply: "Connecting you to a human agent...",
                handoff: true
            });
        }

        // 🔥 Store user message
        sessions[convId].messages.push({
            role: "user",
            content: message
        });

        // 🔥 Escalation analysis
        const escalation = await detectEscalation(message);

        console.info("Escalation result:", escalation);

        // 🔥 Soft escalation
        if (escalation.handoff) {

            sessions[convId].pendingTransfer = true;

            return res.json({
                reply:
                    "I may need additional clarification to help properly. You can provide more details, rephrase the issue, or ask me to connect you to a human agent.",
                handoff: false
            });
        }

        // 🔥 GPT response
        const completion = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: SYSTEM_PROMPT + "\n\n" + KNOWLEDGE
                },
                ...sessions[convId].messages
            ]
        });

        const reply =
            completion.choices[0].message.content;

        // 🔥 Store AI reply
        sessions[convId].messages.push({
            role: "assistant",
            content: reply
        });

        // 🔥 Reset transfer state after successful answer
        sessions[convId].pendingTransfer = false;

        // 🔥 Final response
        res.json({
            reply,
            handoff: false
        });

    } catch (err) {

        console.error("AI SERVER ERROR:", err);

        res.json({
            reply:
                "I ran into a temporary issue. You can try rephrasing your question or ask me to connect you to a human agent.",
            handoff: false
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("AI support agent running on port", PORT);
});