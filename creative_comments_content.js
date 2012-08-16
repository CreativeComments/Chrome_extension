creativeCommentsContent = {
	debug: true,
	clickedElement: null,

	init: function()
	{
		document.addEventListener('mousedown', creativeCommentsContent.click, true);

        chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
			try
			{
				response = eval(request + '(request, sender);');
				sendResponse(response);
			}
			catch(e)
			{
				if(creativeCommentsContent.debug) console.log(e);
			}
		});
	},

	click: function(e) {
		if(e.button == 2) creativeCommentsContent.clickedElement = e.target;
	},

	getClickedItem: function()
	{
		return {"id": creativeCommentsContent.clickedElement.id};
	},

	setContent: function(id, content)
	{
		var $textarea = document.getElementById(id);
		$textarea.value = content;
	}
}

creativeCommentsContent.init();