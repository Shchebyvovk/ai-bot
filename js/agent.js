const API_URL =
    "https://ai-bot-v0-1.onrender.com/message";


let convId =
    null;



export function connect() {

    convId =
        crypto.randomUUID();

    return true;
}



export function disconnect() {

    convId =
        null;
}



export function isConnected() {

    return convId !== null;
}



export async function sendToAgent(message) {

    if (!convId) {
        throw new Error(
            "No conversation"
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
            "Network error"
        );
    }


    const data =
        await response.json();


    return data;
}