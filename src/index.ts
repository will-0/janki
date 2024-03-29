import joplin from 'api';
import { ContentScriptType, MenuItemLocation } from 'api/types';
import { notEqual, rejects } from 'assert';
import { create } from 'domain';
import { resolve } from 'path';
import { title } from 'process';

let invocation_reference = 0;
let anki_clipboard: string;

const default_anki_deck = "Conditions";
var current_anki_deck;

interface WebviewMessage {
	message_type: string,
	content?: any
}

interface WebviewMessageResponse {
	success: boolean,
	content?: any,
	errmsg?: string,
}

function escapeHtml(unsafe)
{
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }

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

	let i=0;
	while ((f.parent_id != "") && (i < 10))
	{
		f = await joplin.data.get(['folders', f.parent_id], { fields: ['id', 'title', 'parent_id'] });
		title_stack.push(replace_spaces(f.title, "-"));
		i++;
	}

	return title_stack.reverse().join("::");
}

async function getDeckNames() {
	return new Promise<Array<String>>(async (resolve, reject) =>
	{

	anki_invoke('deckNames', 6)
		.then(async (deck_list: Array<string>) => {
			console.log(deck_list)

			let index = deck_list.indexOf("Default");
			if (index !== -1) {
				deck_list.splice(index, 1);
			}
			resolve(deck_list as Array<String>);
		}
		)
		.catch(() => {
			console.log("Error occured in logging value");
			reject();
		})

	})
}

async function createCard(message) {

	return new Promise<void>(async (resolve, reject) =>
	{
			//check message conforms:
	if (!message.hasOwnProperty("note_text") || !message.hasOwnProperty("note_extra") || !message.hasOwnProperty("note_tags") || !message.hasOwnProperty("deck_name"))
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

	// Process the input for anki-compatible format (convert line breaks)
	const processed_note_text = message.note_text.replace(/\r\n|\r|\n/g,"<br>")

	// Build the AnkiConnect request
    const request = {
        "note": {
            "deckName": message.deck_name,
            "modelName": "JankiDev",
            "fields": {
                "Text": processed_note_text,
                "Extra": message.note_extra,
				"Joplin Note External Link": "joplin://x-callback-url/openNote?id=" + note.id,
				"Joplin Note ID": note.id
            },
            "tags": note_tags
        }
    }

	anki_invoke('addNote', 6, request)
		.then(async anki_note_id => {

			const note_content = note.body

			const fact_hook = "class=\"unverified-anki\" data-invocation-reference=\"" + String(invocation_reference) + "\">"


			if (note_content.includes(fact_hook)) {
				
				const replacement_text = "class=\"anki-fact\" id=\"" + String(anki_note_id) + "\">" //legacy data-anki-id
				const new_note_content = note_content.replace(fact_hook, replacement_text);

				//checkme
				await joplin.data.put(['notes', note.id], null, {body: new_note_content});
				await joplin.commands.execute("editor.setText", new_note_content);
				// joplin.commands.execute("editor.scrollToHash", String(anki_note_id))
			}
			resolve();
		}
		)
		.catch(() => {
			console.log("Error occured in logging value");
			reject();
		})

	})
	}

joplin.plugins.register({

	onStart: async function() {

		// Create the panel object
		const panel = await joplin.views.panels.create('panel_1');

		// Set some initial content while the TOC is being created
		await joplin.views.panels.setHtml(panel, `
		<div class="level-1" id="tportion">
		<div class="deck-selector">
		  <span class="align-horizontal">
			<select name="decks" id="deck-selector">
			  <option value="Conditions">Conditions</option>
			  <option value="OMOP">OMOP</option>
			</select>
		  </span>
		  <label for="decks">Deck</label>
		</div>
		<hr>
		<h1>Anki note editor</h1>
		<hr>
		<form>
		<label for="textinput">Text</label><br>
		<textarea rows="1" type="text" id="textinput" name="textinput"></textarea><br>
		<label for="extra">Extra</label><br>
		<textarea rows="1" type="text" id="extra" name="extra"></textarea>
		<!-- <label for="citation">Citation</label><br>
		<textarea rows="1" type="text" id="citation" name="citation"></textarea> -->
		</form>
		</div>
		
		<div class="level-1" id="bportion">
			<form>
			<span class="align-horizontal" id="tagspan"><textarea rows="1" type="text" id="tags" name="tags"></textarea></span>
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

		await joplin.views.panels.onMessage(panel, async (message) => {

			return new Promise<WebviewMessageResponse>((resolve, reject) => {
				// I want to always return with a resolve, as I want to pass this message to the sandbox

				console.log("Message received from sandbox");

				if (!message.hasOwnProperty("message_type"))
				{
					throw "Unexpected message from webview sandbox: no message_type property";
				}

				var response: WebviewMessageResponse = {success: null};
	
				switch(message.message_type) {
					case "card_create":
						createCard(message)
							.then(() => {
								response.success = true;
								resolve(response);
							})
							.catch(() => {
								response.success = false;
								resolve(response)
							})
						break;
	
					case "close_note":
						joplin.views.panels.hide(panel);
						break;

					case "get_deck":

						getDeckNames()
							.then((deck_list: Array<String>) => {

								let m_response = {
									selected_deck: null,
									deck_list: null
								}



								//Build the response packet
								m_response.deck_list = deck_list;
								if (typeof current_anki_deck === 'undefined' || current_anki_deck === null) {
									m_response.selected_deck = default_anki_deck;
								} else {
									m_response.selected_deck = current_anki_deck;
								}

								response.content = m_response;

								response.success = true;
								resolve(response);
							})
							.catch(() => {
								response.success = false;
								resolve(response)
							})

						break;

					case "set_deck":
						if (!message.hasOwnProperty("deck")) {
							response.success = false;
							response.errmsg = "Unexpected message from webview sandbox: no deck field for set_deck";
							resolve(response);
						}
						current_anki_deck = message.deck;
						response.success = true;
						resolve(response);
						break;
						
					default:
						console.log("Unexpected message from webview sandbox: unknown message type");
						response.errmsg = "Unexpected message from webview sandbox: unknown message type";
						response.success = false;
						resolve(response)
				}
			})
		});

		await joplin.commands.register({
			name: 'janki_execute',
			label: 'Janki Command',
			execute: async () => {

				const anki_editor_open = await joplin.views.panels.visible(panel);

				if (!anki_editor_open)
				{
					await joplin.views.panels.show(panel);
				} else
				{
					const selectedText = (await joplin.commands.execute('selectedText'));

					invocation_reference = Date.now();

					const safe_text = escapeHtml(selectedText)

					await joplin.commands.execute('replaceSelection', ("<span class=\"unverified-anki\" data-invocation-reference=\"" 
						+ String(invocation_reference) + "\">" + safe_text + "</span>"));

					joplin.clipboard.writeText(selectedText);
					anki_clipboard = selectedText;
				}
			},
		});

		await joplin.views.menuItems.create('Janki', 'janki_execute', MenuItemLocation.Edit, { accelerator: 'Ctrl+G' });

		//HACKY SOLUTION TO JOPLIN BUG: SEE https://github.com/laurent22/joplin/issues/6699
		await joplin.commands.register({
			name: 'blankcommand',
			label: 'Blank Command',
			execute: async () => {}
		});
		await joplin.views.menuItems.create('Blank', 'blankcommand');
	},
});
