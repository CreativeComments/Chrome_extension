/**
 * The object that will be inserted in the content.
 *
 * @author Tijs Verkoyen
 * @author Jan De Poorter
 */
creativeCommentsContent =
{
	version: '0.0.6',
	debug: true,
	siteUrl: 'http://creativecomments.tmc.dev',
	apiUrl: 'http://creativecomments.tmc.dev/en/api/server',
	nimbbKey: '51ee17fd3f',
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
		creativeCommentsContent.window.CC = new Object();
		creativeCommentsContent.window.CC.instance = this;
		creativeCommentsContent.fireAnEvent('loaded', { version: creativeCommentsContent.version }); // this wil let the browser known the plugin is loaded

		var url = creativeCommentsContent.siteUrl + '/plugin_data/js/external.js';
		if(creativeCommentsContent.debug) url += '?t=' + (new Date()).getTime();

		$(div).append('<script src="' + url + '"></script>');

		$.ajaxSetup({
			url: creativeCommentsContent.apiUrl,
			type: 'POST',
			timeout: 5000
		});
		$('a.close').live('click', creativeCommentsContent.removeDialog);

		document.addEventListener('mousedown', creativeCommentsContent.click, true);
		document.addEventListener('video_state_change', creativeCommentsContent.video.stateChange, true);
		document.addEventListener('video_saved', creativeCommentsContent.video.saved, true);
		chrome.extension.onRequest.addListener(
			function(request, sender, sendResponse)
			{
				try
				{
					response = eval(request + '(request, sender);');
					sendResponse(response);
				}
				catch(e)
				{
					if(creativeCommentsContent.debug) console.log(e);
				}
			}
		);

		creativeCommentsContent.hijackCCLinks();
	},

	hijackCCLinks: function()
	{
		document.addEventListener('click', function(e) {
			var url = $(e.target).attr('href');
			if(typeof url != 'undefined' && url.indexOf(encodeURIComponent(creativeCommentsContent.siteUrl + '/en/comments/detail/')) >= 0)
			{
				e.preventDefault();
				e.stopPropagation();
				creativeCommentsContent.showComment(e);
				return false;
			}
		}, true);
	},

	click: function(e)
	{
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

		creativeCommentsContent.window.CC.data = data;

		if(document.createEvent) window.dispatchEvent(event);
		else document.fireEvent('on' + event.eventType, event);
	},

	getClickedItem: function()
	{
		// return the id, when we use the full object an error is triggered.
		return { 'id': creativeCommentsContent.clickedElement.id};
	},

	getFromStore: function(key)
	{
		var value = localStorage.getItem(key);
		if(typeof value == 'undefined') return null;
		else return value;
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
			success: function(data, textStatus, jqXHR)
			{
				if(data.code == 200 && data.data.accessToken != '')
				{
					creativeCommentsContent.saveInStore('access_token', data.data.accessToken);
					response = true;
				}
				else
				{
					creativeCommentsContent.saveInStore('access_token', null);
					creativeCommentsContent.showReport('Login in on the <a href="' + creativeCommentsContent.siteUrl + '">Creative Comments</a>-site.', 'warning');
				}
			},
			error: function(jqXHR, textStatus, errorThrown)
			{
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
		else creativeCommentsContent.showReport('Login in on the <a href="' + creativeCommentsContent.siteUrl + '">Creative Comments</a>-site.', 'warning');
	},

	saveInStore: function(key, value)
	{
		localStorage.setItem(key, value);
	},

	setContent: function(element, content)
	{
		// Facebook needs focus before setting the content.
		$textarea = $(element).focus().val(content);

		// we need to trigger an event on the textarea, but facebook binds for the comment box on the keyup event,
		// where they bind for most other items on keydown.. This kinda sucks
		// @remark: if Facebook changes this will suck..
		var e = document.createEvent('KeyboardEvent');
		e.initKeyboardEvent('keyup', true, true, creativeCommentsContent.window, 0, 0, 0, 0, 39, 0);
		element.dispatchEvent(e);
	},

	removeDialog: function()
	{
		// remove the form if it already exists
		$('#creativeCommentsHolder').remove();
	},

	showComment: function(e)
	{
		e.preventDefault();
		e.stopPropagation();
		e.returnValue = false;

		var url = $(e.target).attr('href');

		url = url.match(/u=(.*)&/g)[0];
		url = url.substr(2, url.length - 3);
		url = decodeURIComponent(url);
		url = url.replace(creativeCommentsContent.siteUrl, '');
		var id = url.replace('/en/comments/detail/', '');

		// @todo	cleanup, as in trailing stuff, only number, ...

		creativeCommentsContent.isLoggedIn(creativeCommentsContent.onLogin);

		var data = {
			'access_token': creativeCommentsContent.getFromStore('access_token'),
			'method': 'comments.get',
			'id': id
		};

		$.ajax({
			data: data,
			success: function(data, textStatus, jqXHR)
			{
				if(creativeCommentsContent.debug) console.log(data);

				// @todo	language stuff
				creativeCommentsContent.removeDialog();
				// build html
				var html =  '<div id="creativeCommentsHolder">' +
							'	<div id="creativeCommentsCommentHolder" class="dialog">'+
							'		<a class="close">close</a>' +
							'		<h2 class="uiHeaderTitle">Creative Comments</h2>';
				if(data.data.videoId != '')
				{
					html += '		<object id="videoPlayer" width="580" height="330">' +
							'			<param name="movie" value="http://player.nimbb.com/nimbb.swf?guid=' + data.data.videoId + '&lang=en&autoplay=1" />' +
							'           <param name="allowScriptAccess" value="always" />' +
							'           <embed name="nimbb" src="http://player.nimbb.com/nimbb.swf?guid=' + data.data.videoId + '&lang=en&autoplay=1" width="320" height="240" allowScriptAccess="always" pluginspage="http://www.adobe.com/go/getflashplayer" type="application/x-shockwave-flash">' +
							'           </embed>' +
							'       </object>';
				}
				if(data.data.text != '')
				{
					html += '		<blockquote>' + data.data.text + '</blockquote>';
				}
				html +=	    '	</div>';
							'</div>';
				$('body').append(html);
			},
			error: function(jqXHR, textStatus, errorThrown)
			{
				if(creativeCommentsContent.debug)
				{
					console.log(jqXHR);
					console.log(textStatus);
					console.log(errorThrown);
				}
			}
		});
	},

	showForm: function(id)
	{
		creativeCommentsContent.removeDialog();
		creativeCommentsContent.isLoggedIn(creativeCommentsContent.onLogin);

		// build html
		var html = '<div id="creativeCommentsHolder">' +
				'	<div id="creativeCommentsFormHolder" class="dialog">'+
				'		<a class="close">close</a>' +
				'		<h2 class="uiHeaderTitle">Creative Comments</h2>' +
				'		<form method="POST" name="creativeCommentsForm" id="creativeCommentsForm">' +
				'			<p>' +
				'				<label for="video">Video</label>' +
				'				<object id="videoRecorder" width="580" height="330">' +
				'					<param name="movie" value="http://player.nimbb.com/nimbb.swf?mode=record&simplepage=1&showmenu=0&showcounter=0&key=' + creativeCommentsContent.nimbbKey + '&lang=en" />' +
				'					<param name="allowScriptAccess" value="always" />' +
				'					<embed name="nimbb" src="http://player.nimbb.com/nimbb.swf?mode=record&simplepage=1&showmenu=0&showcounter=0&key=' + creativeCommentsContent.nimbbKey + '&lang=en" width="580" height="330" allowScriptAccess="always" pluginspage="http://www.adobe.com/go/getflashplayer" type="application/x-shockwave-flash">' +
				'				</object>' +
				'				<a href="#" class="uiButton" id="videoRecorderRecordButton">record</a>' +
				'			</p>' +
				'			<p>' +
				'				<label for="text">Text</label>' +
				'				<textarea name="text" id="ccText" cols="80" height="40"></textarea>' +
				'			</p>' +
				'			<p class="uiButton submitBtn">' +
				'				<input type="submit" value="save" />' +
				'			</p>' +
				'		</form>' +
				'	</div>';
				'</div>';
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
		$('#creativeCommentsForm #videoRecorderRecordButton').on('click', creativeCommentsContent.video.startRecording);
	},

	showReport: function(message, type, close)
	{
		creativeCommentsContent.removeDialog();

		// build html
		var html = '<div id="creativeCommentsHolder">' +
				'	<div id="creativeCommentsMessage" class="message '+ type +'">' +
				'		<a class="close">close</a>' +
				'		<p>' + message + '</p>' +
				'	</div>';
		'</div>';
		$('body').append(html);

		if(close) setTimeout(creativeCommentsContent.removeDialog, 3500);
	},

	submitForm: function(e)
	{
		// prevent default behaviour
		e.preventDefault();

		var data = {
			'access_token': creativeCommentsContent.getFromStore('access_token'),
			'method': 'comments.add',
			'text': $('#creativeCommentsForm #ccText').val(),
			'video_id': creativeCommentsContent.video.guid,
		};

		$.ajax({
			data: data,
			success: function(data, textStatus, jqXHR)
			{
				// @todo	language stuff
				creativeCommentsContent.removeDialog();
				var url = creativeCommentsContent.siteUrl + data.data.fullUrl;
				var message = 'Check the full comment on: ' + url;
				creativeCommentsContent.setContent(creativeCommentsContent.clickedElement, message);
				creativeCommentsContent.showReport('Comment was saved, make sure you include <a href="' + url + '">' + url + '</a> in the comment.', 'success', true);
				creativeCommentsContent.hijackCCLinks();
			},
			error: function(jqXHR, textStatus, errorThrown)
			{
				if(creativeCommentsContent.debug)
				{
					console.log(jqXHR);
					console.log(textStatus);
					console.log(errorThrown);
				}
			}
		});
	}
}

creativeCommentsContent.video = {
	instance: null,
	maxTime: 30,
	timer: null,
	currentTime: 0,
	guid: null,

	init: function() {
		creativeCommentsContent.video.instance = $('#videoRecorder')[0];
		creativeCommentsContent.video.instance.setRecordLength(creativeCommentsContent.video.maxTime);
	},

	saved: function(guid) {
		creativeCommentsContent.video.guid = guid
	},

	stateChange: function(state) {
		if(creativeCommentsContent.debug) console.log(state);
	},

	startRecording: function(e) {
		if(creativeCommentsContent.video.instance == null) creativeCommentsContent.video.init();

		if(creativeCommentsContent.video.instance.getState() == 'recording')
		{
			creativeCommentsContent.video.stopRecording();
		}
		else
		{
			if(!creativeCommentsContent.video.instance.isCaptureAllowed())
			{
				// @todo	nice error
				alert('Please allow access to your webcam.');
				return;
			}

			creativeCommentsContent.video.currentTime = creativeCommentsContent.video.maxTime + 1;
			creativeCommentsContent.video.instance.recordVideo();
			creativeCommentsContent.video.update();
		}
	},

	stopRecording: function(e) {
		clearTimeout(creativeCommentsContent.video.timer);
		if(creativeCommentsContent.video.instance.getState() == 'recording')
		{
			creativeCommentsContent.video.instance.stopVideo();
		}
		$('#creativeCommentsForm #videoRecorderRecordButton').html('record');
	},

	update: function() {
		creativeCommentsContent.video.currentTime--;
		if(creativeCommentsContent.video.currentTime <= 0)
		{
			creativeCommentsContent.video.stopRecording();
		}
		$('#creativeCommentsForm #videoRecorderRecordButton').html('Stop (' + creativeCommentsContent.video.currentTime + ')');
		creativeCommentsContent.video.timer = setTimeout(creativeCommentsContent.video.update, 1000);
	}
}

creativeCommentsContent.init();