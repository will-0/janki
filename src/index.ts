import joplin from 'api';
import { ContentScriptType, MenuItemLocation } from 'api/types';
import { notEqual } from 'assert';
import { create } from 'domain';
import { title } from 'process';

let invocation_reference = 0;
let anki_clipboard: string;

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

function replace_spaces(in_string, character)
{
	//** Gets rid of non-alphanumeric characters and replaces spaces with specified character */

	return in_string.replaceAll(" ", "_").replace(/\W/g, '').replaceAll("_", character)
	
}

// Gets the current address
async function get_note_hierarchy_string()
{
	let f = await joplin.workspace.selectedFolder();

	let title_stack = [replace_spaces(f.title, "-")];

	console.log(title_stack);

	let i=0;
	while ((f.parent_id != "") && (i < 10))
	{
		f = await joplin.data.get(['folders', f.parent_id], { fields: ['id', 'title', 'parent_id'] });
		title_stack.push(replace_spaces(f.title, "-"));
		i++;
	}

	return title_stack.reverse().join("::");
}

async function createCard(message) {
    console.log("Creating card");

	//check message conforms:
	if (!message.hasOwnProperty("note_text") || !message.hasOwnProperty("note_extra") || !message.hasOwnProperty("note_tags"))
	{
		throw "Unexpected message from webview sandbox: insufficient information to create card";
	}

	const note = await joplin.workspace.selectedNote();

	// // Manage the note tags
	const note_tags = message.note_tags;
	if (note_tags.includes("dev")) {note_tags.push("dev")};
	if (note_tags.includes("janki")) {note_tags.push("janki")};

	// //Get the hierarchy string
	const hierarchy_string = "Janki::" + await get_note_hierarchy_string();
	note_tags.push(hierarchy_string);

	// Build the AnkiConnect request
    const request = {
        "note": {
            "deckName": "Conditions",
            "modelName": "JankiDev",
            "fields": {
                "Text": message.note_text,
                "Extra": message.note_extra,
				"Joplin Note External Link": "joplin://x-callback-url/openNote?id=" + note.id,
				"Joplin Note ID": note.id
            },
            "tags": note_tags
        }
    }

	const anki_note_id = await anki_invoke('addNote', 6, request);
	const note_content = note.body

	const fact_hook = "class=\"unverified-anki\" data-invocation-reference=\"" + String(invocation_reference) + "\">"


	if (note_content.includes(fact_hook)) {
		console.log("We got in here somehow");
		console.log(note.body);

		const replacement_text = "class=\"anki-fact\" data-anki-id=\"" + String(anki_note_id) + "\">"

		const new_note_content = note_content.replace(fact_hook, replacement_text);

		//checkme
		await joplin.data.put(['notes', note.id], null, {body: new_note_content});
		joplin.commands.execute("editor.setText", new_note_content);
	}

	// const new_note_content = note_content.replace(selectedText, ("<span id=\"anki\">" + selectedText + "</span>"));
	// await joplin.data.put(['notes', note_id], null, {body: new_note_content});

	console.log("Created note " + anki_note_id);
}

joplin.plugins.register({

	onStart: async function() {

		console.log("Yeah Bebe");

		const note = await joplin.workspace.selectedFolder();
		console.log(note);

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
			<button type="button" id="closeEditorButton">Close</button>
			<button type="button" id="createCardButton">Add</button>
		</div>
		`);

		// Add the css and javascript to the webview
		await joplin.views.panels.addScript(panel, './anki-editor/style.css');
		await joplin.views.panels.addScript(panel, './anki-editor/js/textarea_expand.js');
		await joplin.views.panels.addScript(panel, './anki-editor/js/main.js');

		await joplin.views.panels.hide(panel);

		await joplin.views.panels.onMessage(panel, (message) => {
			console.log("Message received");

			if (!message.hasOwnProperty("message_type"))
			{
				throw "Unexpected message from webview sandbox: no message_type property";
			}

			switch(message.message_type) {
				case "card_create":
					createCard(message);
					break;

				case "close_note":
					joplin.views.panels.hide(panel);
					break;
					
				default:
					console.log("Unexpected message from webview sandbox: unknown message type");
					return 0;
			}

			return 1;
		});

		await joplin.commands.register({
			name: 'janki_higlight',
			label: 'Highlights text and prints to console',
			execute: async () => {
				const selectedText = (await joplin.commands.execute('selectedText'));

				invocation_reference = Date.now();

				await joplin.commands.execute('replaceSelection', ("<span class=\"unverified-anki\" data-invocation-reference=\"" 
					+ String(invocation_reference) + "\">" + selectedText + "</span>"));

				joplin.clipboard.writeText(selectedText);
				anki_clipboard = selectedText;

				await joplin.views.panels.show(panel);
			},
		});

		await joplin.views.menuItems.create('Janki', 'janki_higlight', MenuItemLocation.Edit, { accelerator: 'Ctrl+G' });
	},

});
