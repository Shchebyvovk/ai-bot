const API_URL =
    "https://ai-bot-v0-1.onrender.com/message";


let connected = false;
let convId = null;



export function isConnected() {
    return connected;
}



export function connect() {

    convId =
        crypto.randomUUID();

    connected = true;

    return true;
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


    return data;
}