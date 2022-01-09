import joplin from 'api';
import { MenuItemLocation } from 'api/types';

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
			iconName: 'fas fa-music',
			execute: async () => {
				const selectedText = (await joplin.commands.execute('selectedText'));
				joplin.clipboard.writeText(selectedText);
				console.log(selectedText);

			},
		});

		await joplin.views.menuItems.create('Janki', 'janki_higlight', MenuItemLocation.Edit, { accelerator: 'Ctrl+G' });
	},

});
