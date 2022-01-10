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

		await joplin.commands.register({
			name: 'janki_higlight',
			label: 'Highlights text and prints to console',
			execute: async () => {
				const selectedText = (await joplin.commands.execute('selectedText'));
				await joplin.commands.execute('replaceSelection', ("<span id=\"anki\">" + selectedText + "</span>"));
				joplin.clipboard.writeText(selectedText);

				// [version using data api]
				// const note_id = note.id;
				// const note_content = (await joplin.data.get(['notes', note_id], {fields: ['body']})).body as string;
				// const new_note_content = note_content.replace(selectedText, ("<span id=\"anki\">" + selectedText + "</span>"));
				// await joplin.data.put(['notes', note_id], null, {body: new_note_content});

				joplin.clipboard.writeText(selectedText);
			},
		});

		await joplin.views.menuItems.create('Janki', 'janki_higlight', MenuItemLocation.Edit, { accelerator: 'Ctrl+G' });
	},

});
