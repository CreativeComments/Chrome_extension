/**
 * The object that will live in the background, it wil create and handle the context-menu's.
 *
 * @author Tijs Verkoyen <tijs@sumocoders.be>
 */
creativeCommentsBackground = {
	id: null,

	init: function()
	{
		creativeCommentsBackground.createContextMenu();
	},

	click: function(info, tab)
	{
		if(tab.url.indexOf('facebook.com') < 0) {
			alert('You can\'t create Creative Comments outside Facebook (for now).');
		}

		else
		{
			// on click we should ask our content.js-files which item was clicked
			chrome.tabs.sendRequest(
				tab.id,
				'creativeCommentsContent.getClickedItem',
				function(data)
				{
					// show the form
					chrome.tabs.executeScript(
						tab.id,
						{ code: 'creativeCommentsContent.openForm("'+ data.id + '")' }
					);
				}
			);
		}
	},

	createContextMenu: function()
	{
		// create the context menu
		creativeCommentsBackground.id = chrome.contextMenus.create({
			'title': 'Creative Comments',
			'contexts': ['editable'],
			'onclick': creativeCommentsBackground.click
		});
	}
}

creativeCommentsBackground.init();