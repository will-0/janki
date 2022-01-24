import joplin from 'api';
import { ContentScriptType, MenuItemLocation } from 'api/types';
import { notEqual } from 'assert';

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

async function createCard(message) {
    console.log("Creating card");

	//check message conforms:
	if (!message.hasOwnProperty("note_text") || !message.hasOwnProperty("note_extra") || !message.hasOwnProperty("note_tags"))
	{
		throw "Unexpected message from webview sandbox";
	}

	// Manage the note tags
	const note_tags = message.note_tags;
	if (note_tags.includes("dev")) {note_tags.push("dev")};
	if (note_tags.includes("janki")) {note_tags.push("janki")};

	// Build the AnkiConnect request
    const request = {
        "note": {
            "deckName": "jankidev",
            "modelName": "JankiDev",
            "fields": {
                "Text": message.note_text,
                "Extra": message.note_extra
				""
            },
            "tags": note_tags
        }
    }

    const result = await anki_invoke('addNote', 6, request);

    console.log("Created note " + result);
}

joplin.plugins.register({

	onStart: async function() {

		console.log("Yeah bebe");

		// Create the panel object
		const panel = await joplin.views.panels.create('panel_1');

		// Set some initial content while the TOC is being created
		await joplin.views.panels.setHtml(panel, `
		<div id="tportion">
		<h1>Anki note editor</h1>
		<form>
		<label for="textinput">Text</label><br>
		<textarea rows="1" type="text" id="textinput" name="textinput"></textarea><br>
		<label for="extra">Extra</label><br>
		<textarea rows="1" type="text" id="extra" name="extra"></textarea>
		<!-- <label for="citation">Citation</label><br>
		<textarea rows="1" type="text" id="citation" name="citation"></textarea> -->
		</form>
	  	</div>
	
		<div id="bportion">
			<form>
			<span id="tagspan"><textarea rows="1" type="text" id="tags" name="tags"></textarea></span>
			<label for="tags">Tags</label>
			</form>
			<button type="button">Close</button>
			<button type="button" id="devbutton_createcard">Add</button>
			<button type="button" id="devbutton_createdeck">Create deck (dev)</button>
		</div>
		`);

		// Add the css and javascript to the webview
		await joplin.views.panels.addScript(panel, './anki-editor/style.css');
		await joplin.views.panels.addScript(panel, './anki-editor/js/textarea_expand.js');

		await joplin.views.panels.hide(panel);

		await joplin.views.panels.onMessage(panel, createCard);

		await joplin.commands.register({
			name: 'janki_higlight',
			label: 'Highlights text and prints to console',
			execute: async () => {
				const selectedText = (await joplin.commands.execute('selectedText'));
				await joplin.commands.execute('replaceSelection', ("<span id=\"anki\">" + selectedText + "</span>"));
				joplin.clipboard.writeText(selectedText);

				joplin.clipboard.writeText(selectedText);

				await joplin.views.panels.show(panel);
			},
		});

		await joplin.views.menuItems.create('Janki', 'janki_higlight', MenuItemLocation.Edit, { accelerator: 'Ctrl+G' });
	},

});
