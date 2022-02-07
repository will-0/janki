function update_text_area_size()
{
    var event = new Event('input', {
        bubbles: true,
        cancelable: true,
    });
    
    //Reset the sizes
    document.getElementById("textinput").dispatchEvent(event);
    document.getElementById("extra").dispatchEvent(event);
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
        note_tags : document.getElementById("tags").value.split(" "),
        deck_name : document.getElementById("deck-selector").value
    }
    
    // Everything here will be handled asynchronously
    webviewApi.postMessage(pluginmessage)
    .then((response) => {
        console.log(response)

        if (response==true)
        {
            console.log("Card creation success");
            document.getElementById("textinput").value = "";
            document.getElementById("extra").value = "";

            update_text_area_size();
        }
        else
        {
            console.log("Card creation failure");
        }
    })
    .catch(() => {console.log("Error posting message")})
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

//Key shortcuts
document.addEventListener('keydown', function (event) {
    activeEl = document.activeElement

    // Add cloze deletions
    if ((activeEl.id == "textinput") && (event.ctrlKey && event.shiftKey && (event.key =='c' || event.key == 'C')))
    {
        fulltext = activeEl.value
        highlighted_text = fulltext.slice(activeEl.selectionStart, activeEl.selectionEnd)

        activeEl.value = fulltext.slice(0, activeEl.selectionStart) + 
            "{{c1::" + highlighted_text + 
                "}}" + fulltext.slice(activeEl.selectionEnd);

        // If creating an empty cloze, move inside the cloze
        if (highlighted_text == "") { activeEl.selectionEnd -= 2 };

        //Update the text area size
        update_text_area_size()

    }

    // Ctrl-Enter card creation shortcut
    if (event.ctrlKey && (event.key =='Enter')) {
        createCard();
    }
});

// Add functionality to the buttons
document.getElementById("closeEditorButton").onclick = closeEditor;
document.getElementById("createCardButton").onclick = createCard;
