const API_URL =
    "https://ai-bot-v0-1.onrender.com/message";


let connected = false;
let convId = null;



export function isConnected() {
    return connected;
}



function createConvId() {
    return crypto.randomUUID();
}



export async function connect() {

    try {

        // просто перевіряємо, що браузер може достукатись
        convId =
            createConvId();

        connected = true;

        return true;

    } catch {

        connected = false;
        convId = null;

        return false;
    }
}



export function disconnect() {

    connected = false;
    convId = null;
}



export async function sendToAgent(message) {

    if (!connected) {
        throw new Error(
            "Not connected"
        );
    }


    const payload =
        JSON.stringify({
            message,
            convId
        });


    const response =
        await fetch(API_URL, {

            method: "POST",

            // simple request → no OPTIONS
            headers: {
                "Content-Type":
                    "text/plain"
            },

            body: payload
        });


    const data =
        await response.json();


    return {
        reply: data.reply,
        handoff: data.handoff
    };
}