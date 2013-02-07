/**
 * The object that will be inserted in the content.
 *
 * @author Tijs Verkoyen
 * @author Jan De Poorter
 */
creativeCommentsContent =
{
	version: '0.0.13',
	debug: true,
	siteUrl: 'https://beta.creativecomments.cc',
	apiUrl: 'https://beta.creativecomments.cc/en/api/server',
	nimbbKey: '373f5c99d7',
	clickedElement: null,
	window: null,
	document: null,

	init: function()
	{
		if(creativeCommentsContent.debug) {
			creativeCommentsContent.siteUrl = 'http://creativecomments.tmc.dev';
			creativeCommentsContent.apiUrl = creativeCommentsContent.siteUrl + '/en/api/server';
		}

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

		var scripts = '<script src="' + url + '"></script>';
		$(div).append(scripts);

		$(creativeCommentsContent.document.body).append('<script type="text/javascript" src="https://www.dropbox.com/static/api/1/dropbox.js" id="dropboxjs" data-app-key="dho03wi5xqxe3s8"></script>');

		$.ajaxSetup({
			url: creativeCommentsContent.apiUrl,
			type: 'POST',
			timeout: 5000
		});
		$('a.close').live('click', creativeCommentsContent.removeDialog);

		document.addEventListener('mousedown', creativeCommentsContent.click, true);
		document.addEventListener('video_state_change', creativeCommentsContent.video.stateChange, true);
		document.addEventListener('video_saved', creativeCommentsContent.video.saved, true);
		window.addEventListener('message', creativeCommentsContent.dropbox.setFile);
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
		creativeCommentsContent.tooltips();
	},

	hijackCCLinks: function()
	{
		document.addEventListener('click', function(e) {
			var url = $(e.target).attr('href');

			if(
				typeof url != 'undefined' &&
				(
					url.indexOf(encodeURIComponent(creativeCommentsContent.siteUrl + '/en/comments/detail/')) >= 0 ||
					url.indexOf(creativeCommentsContent.siteUrl + '/en/comments/detail/') >= 0
				)
			)
			{
				e.preventDefault();
				e.stopPropagation();
				creativeCommentsContent.showComment(e);
				return false;
			}
		}, true);
	},

	tooltips: function() {
		var tooltip = '<div id="creativeCommentsTooltip"><span>Hi there, don\'t forget you can use a Creative Comment to get your point across even better.</span></div>';

		$('.UFIAddComment, .fbTimelineComposerUnit').live('mouseenter', function(e) {
			$(this).append(tooltip);
		});
		$('.UFIAddComment, .fbTimelineComposerUnit').live('mouseleave', function(e) {
			$('#creativeCommentsTooltip').remove();
		});
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
		if(url.match(/u=(.*)&/g) != null)
		{
			url = url.match(/u=(.*)&/g)[0];
			url = url.substr(2, url.length - 3);
			url = decodeURIComponent(url);
		}
		url = url.replace(creativeCommentsContent.siteUrl, '');
		// @todo	cleanup, as in trailing stuff, only number, ...
		var id = url.replace('/en/comments/detail/', '');

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
				if(data.code == 500) {
					creativeCommentsContent.saveInStore('access_token', null);
					creativeCommentsContent.showReport('Login in on the <a href="' + creativeCommentsContent.siteUrl + '">Creative Comments</a>-site.', 'warning');
				}

				if(creativeCommentsContent.debug) console.log(data);

				creativeCommentsContent.removeDialog();

				// build html
				var html =	'<div id="creativeCommentsHolder">' +
							'	<div id="creativeCommentsCommentHolder" class="ccDialog">'+
							'		<header>' +
							'			<a class="close">close</a>' +
							'			<h2 class="uiHeaderTitle">Creative Comments</h2>' +
							'		</header>' +
							'		<div id="creativeCommentsForm">' +
							'		    <div id="videoHolder">';
				if(data.data.videoId != null)
				{
					html += '	    		<object id="videoRecorder" width="620" height="330">' +
							'		    		<param name="movie" value="https://player.nimbb.com/nimbb.swf?guid=' + data.data.videoId + '&lang=en&autoplay=1" />' +
							'			    	<param name="allowScriptAccess" value="always" />' +
							'	    			<embed name="nimbb" src="https://player.nimbb.com/nimbb.swf?guid=' + data.data.videoId + '&lang=en&autoplay=1" width="620" height="330" allowScriptAccess="always" pluginspage="http://www.adobe.com/go/getflashplayer" type="application/x-shockwave-flash">' +
							'		    	</object>';
				}
				if(data.data.text != null)
				{
					html += '				<div id="textHolder" class="element" style="display: none;">' +
					        '					' + data.data.text +
					        '				</div>';
				}
				if(data.data.youtube != null)
				{
					html += '				<div id="youtubeHolder" class="element" style="display: none;">' +
							'					' + data.data.youtube +
							'				</div>';
				}
				if(data.data.slideshare != null)
				{
					html += '				<div id="slideshareHolder" class="element" style="display: none;">' +
							'					' + data.data.slideshare +
							'				</div>';
				}
				if(data.data.url != null)
				{
					html += '				<div id="linkHolder" class="element" style="display: none;">' +
							'					<a href="' + data.data.url + '">' + data.data.url + '</a>' +
							'				</div>';
				}
//				'				<div id="pictureHolder" class="element" style="display: none;">' +
//				'					<label for="ccPicture">Picture-url</label>' +
//				'					<input type="text" name="ccPicture" id="ccPicture">' +
//				'				</div>' +
//				'				<div id="fileHolder" class="element" style="display: none;">' +
//				'					<label for="text">File-url</label>' +
//				'					<input type="text" name="ccFile" id="ccFile">' +
//				'				</div>' +
//				'				<div id="dropboxHolder" class="element" style="display: none;">' +
//				'					<input type="text" name="ccDropbox" id="ccDropbox">' +
//				'				</div>' +
				if(data.data.dropbox != null)
				{
					html += '				<div id="dropboxHolder" class="element" style="display: none;">' +
							'					<a href="' + data.data.dropbox + '">' + data.data.dropbox + '</a>' +
							'				</div>';
				}

				html +=	    '				<div id="commentControls">' +
							'					<ul>' +
							'						<li class="submitBtn"><a href="http://creativecomments.cc">Request</a> your account!</li>' +
							'					</ul>' +
							'				</div>' +
							'   		</div>' +
				            '	    	<div id="buttonsLeft">' +
							'		    	<ul>';
				if(data.data.text != null)
				{
					html += '			    	<li><a href="#" class="toggleElement active" data-id="textHolder"><span class="text"></span><span class="label">Show Text</span></a></li>';
				}

				if(data.data.youtube != null)
				{
					html += '                   <li><a href="#" class="toggleElement active" data-id="youtubeHolder"><span class="youtube"></span><span class="label">Show YouTube</span></a></li>';
				}
				if(data.data.slideshare != null)
				{
					html += '			    	<li><a href="#" class="toggleElement active" data-id="slideshareHolder"><span class="slideshare"><span class="label">Show Slideshare</span></a></li>';
				}
				if(data.data.url != null)
				{
					html += '   				<li><a href="#" class="toggleElement" data-id="linkHolder"><span class="link"></span><span class="label">Show link</span></a></li>';
				}

//							'		    		<li><a href="#" class="toggleElement" data-id="pinterestHolder"><span class="pinterest"><span class="label">Add Pinterest</span></a></li>';
				html +=     '	    		</ul>' +
							'		    </div>' +
							'	    	<div id="buttonsRight">' +
							'		    	<ul>';

				if(data.data.dropbox != null)
				{
					html += '	    			<li><a href="#" class="toggleElement active" data-id="dropboxHolder"><span class="dropbox"></span><span class="label">Show Dropbox</span></a></li>';
				}
//							'			    	<li><a href="#" class="toggleElement" data-id="evernoteHolder"><span class="evernote"></span><span class="label">Add Evernote</span></a></li>';
//							'		    		<li><a href="#" class="toggleElement" data-id="pinterestHolder"><span class="pinterest"></span><span class="label">Add Pinterest</span></a></li>';
//							'			    	<li><a href="#" class="toggleElement" data-id="pictureHolder"><span class="picture"></span><span class="label">Add picture</span></a></li>';
//							'	    			<li><a href="#" class="toggleElement" data-id="fileHolder"><span class="file"></span><span class="label">Add file</span></a></li>';

				html +=	    '		    	</ul>' +
							'   		</div>' +
							'	    </div>';
							'   </div>';
							'</div>';
				$('body').append(html);

				$('#creativeCommentsHolder').css('top', $(window).scrollTop() + 20);
				$('.toggleElement').on('click', creativeCommentsContent.toggleElement);
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
		var html =	'<div id="creativeCommentsHolder">' +
					'	<div id="creativeCommentsFormHolder" class="ccDialog">' +
					'		<header>' +
					'			<a class="close">close</a>' +
					'			<h2 class="uiHeaderTitle">Creative Comments</h2>' +
					'		</header>' +
					'		<form method="POST" name="creativeCommentsForm" id="creativeCommentsForm">' +
					'			<div id="videoHolder">' +
					'				<object id="videoRecorder" width="620" height="330">' +
					'					<param name="movie" value="https://player.nimbb.com/nimbb.swf?mode=record&simplepage=1&showmenu=0&showcounter=0&key=' + creativeCommentsContent.nimbbKey + '&lang=en" />' +
					'					<param name="allowScriptAccess" value="always" />' +
					'					<embed name="nimbb" src="https://player.nimbb.com/nimbb.swf?mode=record&simplepage=1&showmenu=0&showcounter=0&key=' + creativeCommentsContent.nimbbKey + '&lang=en" width="620" height="330" allowScriptAccess="always" pluginspage="http://www.adobe.com/go/getflashplayer" type="application/x-shockwave-flash">' +
					'				</object>' +
					'				<div id="textHolder" class="element" style="display: none;">' +
					'					<label for="ccText">Insert your text below</label>' +
					'					<textarea name="ccText" id="ccText" cols="80" rows="10"></textarea>' +
					'				</div>' +
					'				<div id="youtubeHolder" class="element" style="display: none;">' +
					'					<label for="ccYoutubeEmbedCode" class="muted">Paste the embed code of the YouTube-video in the box below.</label>' +
					'					<textarea name="ccYoutubeEmbedCode" id="ccYoutubeEmbedCode" cols="80" rows="4"></textarea>' +
					'				</div>' +
					'				<div id="slideshareHolder" class="element" style="display: none;">' +
					'					<label for="ccSlideshareEmbedCode" class="muted">Paste the embed code of the Slideshare-item in the box below.</label>' +
					'					<textarea name="ccSlideshareEmbedCode" id="ccSlideshareEmbedCode" cols="80" rows="4"></textarea>' +
					'				</div>' +
					'				<div id="linkHolder" class="element" style="display: none;">' +
					'					<label for="ccUrl">Url</label>' +
					'					<input type="text" name="ccUrl" id="ccUrl">' +
					'				</div>' +
					'				<div id="pictureHolder" class="element" style="display: none;">' +
					'					<label for="ccPicture">Picture-url</label>' +
					'					<input type="text" name="ccPicture" id="ccPicture">' +
					'				</div>' +
					'				<div id="fileHolder" class="element" style="display: none;">' +
					'					<label for="text">File-url</label>' +
					'					<input type="text" name="ccFile" id="ccFile">' +
					'				</div>' +
					'				<div id="dropboxHolder" class="element" style="display: none;">' +
					'					<input type="text" name="ccDropbox" id="ccDropbox">' +
					'				</div>' +
					'				<div id="commentControls">' +
					'					<ul>' +
					'						<li class="record">' +
					'							<a href="#" id="videoRecorderRecordButton">Start recording</a>' +
					'							<span class="counter">' + creativeCommentsContent.video.maxTime + '</span>' +
					'						</li>' +
					'						<li class="feedback">slecht okay goed</li>' +
					'						<li class="submitBtn"><input class="inputSubmit" type="submit" value="Submit" /></li>' +
					'					</ul>' +
					'				</div>' +
					'			</div>' +
					'			<div id="buttonsLeft">' +
					'				<ul>' +
					'					<li><a href="#" class="toggleElement" data-id="textHolder"><span class="text"></span><span class="label">Add Text</span></a></li>' +
					'					<li><a href="#" class="toggleElement" data-id="youtubeHolder"><span class="youtube"></span><span class="label">Add YouTube</span></a></li>' +
//					'					<li><a href="#" class="toggleElement" data-id="pinterestHolder"><span class="pinterest"><span class="label">Add Pinterest</span></a></li>' +
					'					<li><a href="#" class="toggleElement" data-id="slideshareHolder"><span class="slideshare"><span class="label">Add Slideshare</span></a></li>' +
					'					<li><a href="#" class="toggleElement" data-id="linkHolder"><span class="link"></span><span class="label">Add link</span></a></li>' +
					'				</ul>' +
					'			</div>' +
					'			<div id="buttonsRight">' +
					'				<ul>' +
//					'					<li><a href="#" class="toggleElement" data-id="evernoteHolder"><span class="evernote"></span><span class="label">Add Evernote</span></a></li>' +
					'					<li><a href="#" class="toggleElement" data-id="dropboxHolder" id="ccDropboxChoose"><span class="dropbox"></span><span class="label">Add Dropbox</span></a></li>' +
//					'					<li><a href="#" class="toggleElement" data-id="pinterestHolder"><span class="pinterest"></span><span class="label">Add Pinterest</span></a></li>' +
					'					<li><a href="#" class="toggleElement" data-id="pictureHolder"><span class="picture"></span><span class="label">Add picture</span></a></li>' +
					'					<li><a href="#" class="toggleElement" data-id="fileHolder"><span class="file"></span><span class="label">Add file</span></a></li>' +
					'				</ul>' +
					'			</div>' +
					'		</form>' +
					'	</div>' +
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

		// set it on the correct position
		$creativeCommentsHolder.css('top', $(window).scrollTop() + 20);

		// bind events
		$creativeCommentsForm.on('submit', creativeCommentsContent.submitForm);
		$('.toggleElement').on('click', creativeCommentsContent.toggleElement);
		$('#creativeCommentsForm #videoRecorderRecordButton').on('click', creativeCommentsContent.video.startRecording);
		$('#ccDropboxChoose').on('click', creativeCommentsContent.dropbox.open);
	},

	showReport: function(message, type, close)
	{
		creativeCommentsContent.removeDialog();

		// build html
		var html =  '<div id="creativeCommentsHolder">' +
					'   <div id="creativeCommentsMessage" class="message '+ type +'">' +
					'		<a class="close">close</a>' +
					'		<p>' + message + '</p>' +
					'	</div>';
					'</div>';
		$('body').append(html);
		$('#creativeCommentsHolder').css('top', $(window).scrollTop() + 20);
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
			'youtube': $('#creativeCommentsForm #ccYoutubeEmbedCode').val(),
			'slideshare': $('#creativeCommentsForm #ccSlideshareEmbedCode').val(),
			'link': $('#creativeCommentsForm #ccUrl').val(),
			'dropbox': $('#creativeCommentsForm #ccDropbox').val(),
			'video_id': creativeCommentsContent.video.guid,
		};

		$.ajax({
			data: data,
			success: function(data, textStatus, jqXHR)
			{
				if(creativeCommentsContent.debug) console.log(data);

				// @todo	language stuff
				creativeCommentsContent.removeDialog();
				var url = creativeCommentsContent.siteUrl + data.data.fullUrl;
				var message = 'Check the full comment on: ' + url;
				creativeCommentsContent.setContent(creativeCommentsContent.clickedElement, message);
				creativeCommentsContent.showReport('Comment was saved, make sure you include <a href="' + url + '">' + url + '</a> in the comment. And don\'t forget to press enter.', 'success', true);
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
	},

	toggleElement: function(e)
	{
		e.preventDefault();
		$element = $('#' + $(this).data('id'));
		// hide other elements
		$('.element').each(function() {
			if($(this).attr('id') != $element.attr('id')) $(this).hide();
		});

		if($element.is(':visible')) $element.hide();
		else $element.show();
	}
}

creativeCommentsContent.dropbox = {
	open: function(e) {
		creativeCommentsContent.window.Dropbox.appKey = 'dho03wi5xqxe3s8';
		creativeCommentsContent.window.Dropbox.choose({
			success: function(files) {},
			cancel: function() {}
		});
	},

	setFile: function(e) {
		try
		{
			$('#ccDropbox').val(jQuery.parseJSON(e.data).params.link).focus();
			window.focus();
		}
		catch(e)
		{
		}
	}
}

creativeCommentsContent.video = {
	instance: null,
	maxTime: 20,
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
				creativeCommentsContent.showReport('To record a video we need access to your webcam.', 'error');
				return;
			}

			creativeCommentsContent.video.currentTime = creativeCommentsContent.video.maxTime + 1;
			creativeCommentsContent.video.instance.recordVideo();
			creativeCommentsContent.video.update();
			$('#creativeCommentsForm #startRecording').html('Stop recording');
			$('#videoRecorderRecordButton').addClass('recording');
		}
	},

	stopRecording: function(e) {
		clearTimeout(creativeCommentsContent.video.timer);
		if(creativeCommentsContent.video.instance.getState() == 'recording')
		{
			creativeCommentsContent.video.instance.stopVideo();
		}
		$('#creativeCommentsForm #startRecording').html('Start recording');
		$('#videoRecorderRecordButton').addClass('recording');
	},

	update: function() {
		creativeCommentsContent.video.currentTime--;
		if(creativeCommentsContent.video.currentTime <= 0)
		{
			creativeCommentsContent.video.stopRecording();
		}
		else
		{
			$('#commentControls span.counter').html(creativeCommentsContent.video.currentTime);
			creativeCommentsContent.video.timer = setTimeout(creativeCommentsContent.video.update, 1000);
		}
	}
}

creativeCommentsContent.init();