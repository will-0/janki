import joplin from 'api';
import { ContentScriptType, MenuItemLocation } from 'api/types';

function noteHeaders(noteBody:string) {
	const headers = [];
	const lines = noteBody.split('\n');
	for (const line of lines) {
		const match = line.match(/^(#+)\s(.*)*/);
		if (!match) continue;
		headers.push({
			level: match[1].length,
			text: match[2],
		});
	}
	return headers;
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
			<button type="button">Add</button>
		</div>
		`);

		await joplin.views.panels.addScript(panel, './anki-editor/style.css');
		await joplin.views.panels.addScript(panel, './anki-editor/textarea_expand.js');

		await joplin.views.panels.hide(panel);

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
