async function testFunction() {
    console.log("Hello world!");
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
        note_text : document.getElementById("textinput").value,
        note_extra : document.getElementById("extra").value,
        note_tags : document.getElementById("tags").value.split(" ")
    }

    console.log(pluginmessage);

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