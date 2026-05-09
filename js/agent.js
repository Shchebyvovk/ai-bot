const API_URL =
    "https://ai-bot-v0-1.onrender.com/message";


let connected = false;
let convId = null;



function generateConvId() {

    return crypto.randomUUID();
}



export function isConnected() {

    return connected;
}



export function getConversationId() {

    return convId;
}



export async function connect() {

    try {

        convId =
            generateConvId();


        // ping server
        const response =
            await fetch(API_URL, {

                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    message: "connection_test",
                    convId
                })
            });


        if (!response.ok) {
            throw new Error();
        }


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


    const response =
        await fetch(API_URL, {

            method: "POST",

            headers: {
                "Content-Type":
                    "application/json"
            },

            body: JSON.stringify({
                message,
                convId
            })
        });


    if (!response.ok) {
        throw new Error(
            "Server error"
        );
    }


    const data =
        await response.json();


    return {
        reply: data.reply,
        handoff: data.handoff
    };
}