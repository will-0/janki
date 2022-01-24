
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
        note_text : document.getElementById("textinput").value,
        note_extra : document.getElementById("extra").value,
        note_tags : document.getElementById("tags").value.split(" ")
    }

    console.log(pluginmessage);

    const response = await webviewApi.postMessage(pluginmessage)

    if (response==1)
    {
        console.log("Success");
        document.getElementById("textinput").value = "";
        document.getElementById("extra").value = "";
    }
    else
    {
        console.log("Failure");
    }
}

async function closeEditor() {

    pluginmessage = {
        message_type : "close_note",
    }

    const response = await webviewApi.postMessage(pluginmessage)

    if (response==1)
    {
        console.log("Success");
        document.getElementById("textinput").value = "";
        document.getElementById("extra").value = "";
    }
    else
    {
        console.log("Failure");
    }
}

// Script

document.addEventListener('keydown', function (event) {
    activeEl = document.activeElement
    if ((activeEl.id == "textinput") && (event.ctrlKey && event.shiftKey && (event.key =='c' || event.key == 'C')))
    {
        fulltext = activeEl.value
        activeEl.value = fulltext.slice(0, activeEl.selectionStart) + 
            "{{c1::" + fulltext.slice(activeEl.selectionStart, activeEl.selectionEnd) + 
                "}}" + fulltext.slice(activeEl.selectionEnd);
    }
    if (event.ctrlKey && event.shiftKey && (event.key =='Enter')) {
        createCard();
    }
});