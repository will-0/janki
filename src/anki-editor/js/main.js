function anki_invoke(action, version, params={}) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.addEventListener('error', () => reject('failed to issue request'));
        xhr.addEventListener('load', () => {
            try {
                const response = JSON.parse(xhr.responseText);
                if (Object.getOwnPropertyNames(response).length != 2) {
                    throw 'response has an unexpected number of fields';
                }
                if (!response.hasOwnProperty('error')) {
                    throw 'response is missing required error field';
                }
                if (!response.hasOwnProperty('result')) {
                    throw 'response is missing required result field';
                }
                if (response.error) {
                    throw response.error;
                }
                resolve(response.result);
            } catch (e) {
                reject(e);
            }
        });

        xhr.open('POST', 'http://127.0.0.1:8765');
        xhr.send(JSON.stringify({action, version, params}));
    });
}

async function testFunction() {
    console.log("Hello world!");
    const result = await anki_invoke('createDeck', 6, {deck: 'jankidev'});
    console.log(result);
}

/**
 * createCard() runs in the webview sandbox. When the button is clicked, it sends a message to the plugin with the following data:
 * 
 * - Text
 * - Extra
 * - Tags
 */
async function createCard() {

    pluginmessage = {
        message_type : "card_create",
        note_text : document.getElementById("textinput"),
        note_extra : document.getElementById("extra"),
        note_tags : document.getElementById("tags").split(" ")
    }

    const response = await webviewApi.postMessage(pluginmessage)

    if (response)
    {
        console.log("Success");
    }
    else
    {
        console.log("Failure");
    }
}

document.getElementById("devbutton_createcard").onclick = createCard