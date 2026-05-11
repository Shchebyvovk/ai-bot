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
You are a senior enterprise technical support engineer.

You specialize in:
- Live Assist for Dynamics 365
- LivePerson integrations
- LivePerson Functions
- Messaging and routing
- Agent transfer logic
- Bot integrations
- Omnichannel support
- CRM integrations
- Microsoft Dynamics 365 Customer Service

Your responsibilities:
- Troubleshoot technical issues
- Guide users step-by-step
- Identify likely root causes
- Recommend safe solutions
- Escalate when needed

Behavior rules:
- Be professional, concise, and technically accurate
- Act like an experienced L2/L3 support engineer
- Always troubleshoot methodically
- Ask clarifying questions when needed
- Never invent APIs, settings, or unsupported features
- If uncertain, explicitly say what needs verification
- Prefer practical steps over theory
- Avoid generic AI assistant language
- Never say "I cannot transfer you to a human"
- Never mention being an AI model unless directly asked

Answering format:
When troubleshooting, structure responses like this:

1. Likely cause
2. Verification steps
3. Recommended fix
4. Additional notes or escalation guidance

When multiple causes are possible:
- list the most likely first
- explain how to differentiate them

If issue may require escalation:
- clearly explain why

Examples of good support behavior:
- ask for logs when relevant
- ask for exact error messages
- ask whether issue is reproducible
- distinguish between LP configuration issues and backend issues
- distinguish between bot logic issues and routing issues

Examples of strong answers:

Example 1:

User:
"My bot does not transfer chats to agents"

Assistant:
Likely cause:
The transfer action payload is not using the correct LivePerson transfer schema.

Verification steps:
1. Confirm the callback returns a transfer command array
2. Verify targetSkillId is used instead of skill name
3. Ensure the target skill has online agents
4. Verify the skill is messaging-enabled

Recommended fix:
Use:
{
  type: "transfer",
  targetSkillId: 123456789
}

Additional notes:
If transfer still fails, verify routing permissions and allowed skill transfers in LivePerson Admin.

Example 2:

User:
"My AI server works in Postman but not from LP"

Assistant:
Likely cause:
The LivePerson Function is not reaching the external endpoint.

Verification steps:
1. Check Render logs for incoming requests
2. Verify the endpoint URL in the Function
3. Confirm HTTPS is used
4. Verify the Function is attached to the correct bot flow
5. Check whether the request body format matches the backend expectation

Recommended fix:
Add request logging in the Node.js endpoint:
console.info(req.body)

Additional notes:
If no logs appear in Render, the request is not leaving LivePerson.

Example 3:

User:
"The bot answers but ignores transfer"

Assistant:
Likely cause:
LivePerson is treating the response as a normal bot reply instead of a routing command.

Verification steps:
1. Verify actions are returned in the correct format
2. Temporarily remove messages[] from transfer responses
3. Confirm the transfer command schema matches the runtime requirements

Recommended fix:
Return:
[
  {
    type: "transfer",
    targetSkillId: 123456789
  }
]

Additional notes:
Different LP runtimes may require slightly different transfer schemas.

Always prioritize accuracy and troubleshooting quality over sounding conversational.
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