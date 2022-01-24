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

async function createCard() {
    console.log("Creating card");

    note_text = document.getElementById("textinput");
    note_extra = document.getElementById

    const request = {
        "note": {
            "deckName": "jankidev",
            "modelName": "JankiDev",
            "fields": {
                "Text": "Test this {{c1::beep beep}}",
                "Extra": "",
            },
            "tags": [
                "janki"
            ]
        }
    }

    const result = await anki_invoke('addNote', 6, request);
    console.log(result);
}

document.getElementById("devbutton_createdeck").onclick = testFunction;
document.getElementById("devbutton_createcard").onclick = createCard;

// const result = await invoke('deckNames', 6);
// console.log(`got list of decks: ${result}`);