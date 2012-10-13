/**
 * The object that will be inserted in the content.
 *
 * @author Tijs Verkoyen
 * @author Jan De Poorter
 */
creativeCommentsContent = {
	debug: true,
	siteUrl: 'http://creativecomments.tmc.dev',
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

		$.ajaxSetup({
			url: creativeCommentsContent.apiUrl,
			type: 'POST',
			timeout: 5000
		});

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
		return 5;
		return localStorage.getItem(key);
	},

	isLoggedIn: function()
	{
		var response = false;

		$.ajax({
			async: false,
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
		var html = '<div id="creativeCommentsHolder">' +
		           '    <div id="creativeCommentsFormHolder" class="dialog">'+
		           '        <h2 class="uiHeaderTitle">Creative Comments</h2>' +
		           '        <form method="POST" name="creativeCommentsForm" id="creativeCommentsForm">' +
		           '            <p>' +
		           '                <label for="text">Tekst</label>' +
		           '                <textarea name="text" id="ccText" cols="80" height="40"></textarea>' +
		           '            </p>' +
		           '            <p class="uiButton submitBtn">' +
		           '                <input type="submit" value="save" />' +
		           '            </p>' +
		           '        </form>' +
		           '    </div>';
		           '</div>';

		// append the HTML
		$('body').append(html);

		// create editor
		editor = new nicEditor({
			iconsPath: creativeCommentsContent.siteUrl + '/plugin_data/images/nicEditorIcons.gif',
			buttonList: [ 'fontFormat', 'bold', 'italic', 'subscript', 'superscript', 'ol', 'ul', 'image', 'link' ]
		}).panelInstance('ccText');

		// set focus
		$('#ccText').focus();

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

		var data = {
			'access_token': creativeCommentsContent.getFromStore('access_token'),
			'method': 'comments.add',
			'text': $('#creativeCommentsForm #ccText').val()
		};

		$.ajax({
			data: data,
			success: function(data, textStatus, jqXHR) {
				creativeCommentsContent.removeForm();
				// @todo    language stuff
				var message = 'Check the full comment on: ' + creativeCommentsContent.siteUrl + data.data.fullUrl;
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