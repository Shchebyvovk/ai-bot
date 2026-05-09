const API_URL =
    "https://ai-bot-v0-1.onrender.com/message";


let connected = false;


export function isConnected() {
    return connected;
}


export async function connect() {

    try {

        // health check
        await fetch(API_URL, {
            method: "OPTIONS"
        });

        connected = true;

        return true;

    } catch {

        connected = false;

        return false;
    }
}


export function disconnect() {

    connected = false;
}


export async function sendToAgent(message) {

    if (!connected) {
        throw new Error("Not connected");
    }

    const response =
        await fetch(API_URL, {

            method: "POST",

            headers: {
                "Content-Type":
                    "application/json"
            },

            body: JSON.stringify({
                message
            })
        });

    const data =
        await response.json();

    return (
        data.response
        || data.message
        || "No response"
    );
}