import {
    connect,
    disconnect,
    isConnected,
    sendToAgent
}
from "./agent.js";


const connectBtn =
    document.getElementById("connectBtn");

const sendBtn =
    document.getElementById("sendBtn");

const messageInput =
    document.getElementById("messageInput");

const messages =
    document.getElementById("messages");


function addMessage(type, text) {

    const div =
        document.createElement("div");

    div.className =
        `message ${type}`;

    div.textContent =
        text;

    messages.appendChild(div);

    messages.scrollTop =
        messages.scrollHeight;
}


function updateUI() {

    const connected =
        isConnected();

    connectBtn.textContent =
        connected
            ? "Disconnect"
            : "Connect";

    connectBtn.classList.toggle(
        "connected",
        connected
    );

    messageInput.disabled =
        !connected;

    sendBtn.disabled =
        !connected;
}



async function handleConnectClick() {

    if (isConnected()) {

        disconnect();

        addMessage(
            "bot",
            "Disconnected"
        );

    } else {

        const success =
            await connect();

        addMessage(
            "bot",
            success
                ? "Connected"
                : "Connection failed"
        );
    }

    updateUI();
}



async function handleSend() {

    const text =
        messageInput.value.trim();

    if (!text) {
        return;
    }

    addMessage(
        "user",
        text
    );

    messageInput.value = "";

    try {

        const reply =
            await sendToAgent(text);

        addMessage(
            "bot",
            reply
        );

    } catch {

        addMessage(
            "bot",
            "Send error"
        );
    }
}



connectBtn.addEventListener(
    "click",
    handleConnectClick
);


sendBtn.addEventListener(
    "click",
    handleSend
);


messageInput.addEventListener(
    "keypress",
    e => {

        if (e.key === "Enter") {
            handleSend();
        }
    }
);


updateUI();