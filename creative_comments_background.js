creativeCommentsBackground = {
	id: null,

	init: function()
	{
		creativeCommentsBackground.createContextMenu();
	},

	click: function(info, tab) {
		chrome.tabs.sendRequest(tab.id, "creativeCommentsContent.getClickedItem", function(data) {
			var message = "http://www.sumocoders.be [typ hier iets, want anders werkt het niet]";
			creativeCommentsBackground.sendUrl(tab, data.id, message);
		});
	},

	sendUrl: function(tab, id, url) {
		chrome.tabs.executeScript(
			tab.id,
			{ code: "creativeCommentsContent.setContent('"+ id +"', '" + url + "')" }
		);
	},

	createContextMenu: function() {
		creativeCommentsBackground.id = chrome.contextMenus.create({
			"title": "Creative Comments",
			"contexts": ["editable"],
			"onclick": creativeCommentsBackground.click
		});
	}
}

creativeCommentsBackground.init();