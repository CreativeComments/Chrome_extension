/**
 * The object that will be inserted in the content.
 *
 * @author Tijs Verkoyen
 * @author Jan De Poorter
 */
creativeCommentsContent = {
	debug: true,
	apiUrl: 'http://creativecomments.tmc.dev/en/api/server',
	clickedElement: null,
	window: null,
	document: null,

	init: function()
	{
		var div = document.createElement('div');
		div.setAttribute('onclick', 'return window;');
		creativeCommentsContent.window = div.onclick();
		var div = document.createElement('div');
		div.setAttribute('onclick', 'return document;');
		creativeCommentsContent.document = div.onclick();
		creativeCommentsContent.fireAnEvent('loaded'); // this wil let the browser known the plugin is loaded

		document.addEventListener('mousedown', creativeCommentsContent.click, true);
        chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
			try {
				response = eval(request + '(request, sender);');
				sendResponse(response);
			} catch(e) {
				if(creativeCommentsContent.debug) console.log(e);
			}
		});
	},

	click: function(e) {
		// store the element only when a right click is triggered
		if(e.button == 2) creativeCommentsContent.clickedElement = e.target;
	},

	fireAnEvent: function(name, data)
	{
		name = 'cco:' + name;

		var event;
		if(document.createEvent)
		{
			event = document.createEvent('HTMLEvents');
			event.initEvent(name, true, true);
		}
		else
		{
			event = document.createEventObject();
			event.eventType = name;
		}

		if(document.createEvent) window.dispatchEvent(event);
		else document.fireEvent('on' + event.eventType, event);
	},

	getClickedItem: function()
	{
		// return the id, when we use the full object an error is triggered.
		return {"id": creativeCommentsContent.clickedElement.id};
	},

	getFromStore: function(key)
	{
		return localStorage.getItem(key);
	},

	isLoggedIn: function()
	{
		var response = false;

		$.ajax({
			async: false,
			type: 'POST',
			timeout: 5,
			url: creativeCommentsContent.apiUrl,
			data: {
				method: 'users.isLoggedIn',
				access_token: creativeCommentsContent.getFromStore('access_token')
			},
			success: function(data, textStatus, jqXHR) {
				if(data.code == 200)
				{
					creativeCommentsContent.saveInStore('access_token', data.data.access_token);
					response = true
				}
			},
			error: function(jqXHR, textStatus, errorThrown){
				if(creativeCommentsContent.debug)
				{
					console.log(jqXHR);
					console.log(textStatus);
					console.log(errorThrown);
				}
			}
		});

		return response;
	},

	openForm: function(id)
	{
		if(creativeCommentsContent.isLoggedIn()) creativeCommentsContent.showForm(id);
		else {
			// @todo    fix me
			alert('Not logged in.')
			creativeCommentsContent.showLoginScreen(id);
		}
	},

	saveInStore: function(key, value)
	{
		localStorage.setItem(key, value);
	},

	setContent: function(id, content)
	{
		// Facebook needs focus before setting the content.
		$textarea = $('#' + id).focus().val(content);

		// we need to trigger an event on the textarea, but facebook binds for the comment box on the keyup event,
		// where they bind for most other items on keydown.. This kinda sucks
		// @remark: if Facebook changes this will suck..
		var e = document.createEvent('KeyboardEvent');
		e.initKeyboardEvent('keyup', true, true, creativeCommentsContent.window, 0, 0, 0, 0, 39, 0);
		$textarea[0].dispatchEvent(e);
	},

	removeForm: function()
	{
		// remove the form if it already exists
		$('#creativeCommentsHolder').remove();
	},

	showForm: function(id)
	{
		creativeCommentsContent.isLoggedIn(creativeCommentsContent.onLogin);

		// remove previous
		creativeCommentsContent.removeForm();

		// build html
		var html = '<div id="creativeCommentsHolder">'+
		           '    <h1>Creative Comments</h1>' +
		           '    <form method="POST" name="creativeCommentsForm" id="creativeCommentsForm">' +
		           '        <p>' +
		           '            <label for="text">Tekst</label>' +
		           '            <textarea name="text" id="text"></textarea>' +
		           '        </p>' +
		           '        <p>' +
		           '            <input type="submit" value="save" />' +
		           '        </p>' +
		           '    </form>' +
		           '</div>';

		// append the HTML
		$('body').append(html);

		// set focus
		$('#text').focus();

		// init some vars
		var $creativeCommentsHolder = $('#creativeCommentsHolder');
		var $creativeCommentsForm = $('#creativeCommentsForm');

		// bind events
		$creativeCommentsForm.on('submit', creativeCommentsContent.submitForm);
	},

	submitForm: function(e)
	{
		// prevent default behaviour
		e.preventDefault();

		var data = $('#creativeCommentsForm').serialize();

		$.ajax({
			type: 'POST',
			url: 'http://testing.verkoyen.eu/log.php',
			data: data,
			success: function(data, textStatus, jqXHR) {
				// remove the form
				creativeCommentsContent.removeForm();

				// build message
				var message = "Bekijk mijn volledige reactie via: http://testing.verkoyen.eu/cc/example.html?id=3";

				// set content
				creativeCommentsContent.setContent(creativeCommentsContent.clickedElement.id, message);
			},
			error: function(jqXHR, textStatus, errorThrown){
				console.log(jqXHR);
				console.log(textStatus);
				console.log(errorThrown);
			}
		});
	}
}

creativeCommentsContent.init();