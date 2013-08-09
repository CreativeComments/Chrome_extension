/**
 * The object that will be inserted in the content.
 *
 * @author Tijs Verkoyen
 * @author Jan De Poorter
 */
creativeCommentsContent =
{
    version: '0.0.40',
    debug: false,
    siteUrl: 'https://beta.creativecomments.cc',
    apiUrl: 'https://beta.creativecomments.cc/en/api/server',
    clickedElement: null,
    window: null,
    document: null,
    showTooltip: true,

    init: function()
    {
        if(creativeCommentsContent.debug) {
            creativeCommentsContent.siteUrl = 'http://creativecomments.tmc.com';
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

        creativeCommentsContent.tooltips();
    },

    tooltips: function() {
        var tooltip = '<div id="creativeCommentsTooltip"><span>Spice-up this conversation! Right-click and use Creative Comments.</span></div>';

        $('.UFIAddComment, .fbTimelineComposerUnit').live('mouseenter', function(e) {
            if(creativeCommentsContent.showTooltip) {
                $(this).append(tooltip);
            }
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
                    creativeCommentsContent.saveInStore('id', data.data.id);
                    response = true;
                }
                else
                {
                    creativeCommentsContent.saveInStore('access_token', null);
                    creativeCommentsContent.showReport('Sign in on the <a href="' + creativeCommentsContent.siteUrl + '">Creative Comments</a> site.', 'warning');
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
        else creativeCommentsContent.showReport('Sign in on the <a href="' + creativeCommentsContent.siteUrl + '">Creative Comments</a> site.', 'warning');
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
	    creativeCommentsContent.video.instance = null;
        $('#creativeCommentsHolder').remove();
    },

    showForm: function(id)
    {
        creativeCommentsContent.removeDialog();
        creativeCommentsContent.isLoggedIn(creativeCommentsContent.onLogin);
        creativeCommentsContent.showTooltip = true;

        var d = new Date();
        creativeCommentsContent.video.streamName = creativeCommentsContent.getFromStore('id') + '_' + Math.round((new Date()).getTime() / 1000)  + '.f4v'

        // build html
        var html =  '<div id="creativeCommentsHolder">' +
                    '   <div id="creativeCommentsFormHolder" class="ccDialog">' +
                    '       <header>' +
                    '           <a class="close">close</a>' +
                    '           <h2 class="uiHeaderTitle">Creative Comments</h2>' +
                    '       </header>' +
                    '       <form method="POST" name="creativeCommentsForm" id="creativeCommentsForm">' +
                    '           <div class="text">' +
                    '               <p id="titleHolder" class="fakeElement">' +
	                '           	    <label for="ccTitle" class="hidden" style="display: none;">Title</label>' +
	                '           	    <input name="text" id="ccTitle" width="100%" placeholder="Title">' +
					'               </p>' +
                    '               <p id="textHolder" class="fakeElement">' +
                    '                   <label for="ccText" class="hidden" style="display: none;">Text</label>' +
                    '                   <textarea name="text" id="ccText" height="20" width="620" style="width: 620px; height: 40px;" placeholder=\'More? Keep it short, sweet and make a 20" video...\' ></textarea>' +
                    '               </p>' +
                    '           </div>' +
                    '            <div class="creativeCommentContent">' +
                    '               <div id="videoHolder">' +
                    '                   <iframe id="videoRecorderHolder" src="' + creativeCommentsContent.siteUrl + '/en/api/recorder/?id=' + creativeCommentsContent.video.streamName  + '" width="615" height="350" border="0" scrolling="no" style="overflow: hidden; border: none !important;"></iframe>' +
                    '                   <iframe style="display: none;" id="videoPlayerHolder" width="615" height="350" border="0" scrolling="no" style="overflow: hidden; border: none !important;"></iframe>' +
                    '                   <div id="commentControls">' +
                    '                       <ul>' +
                    '                           <li class="record">' +
                    '                               <a href="#" id="videoRecorderRecordButton">Record</a>' +
                    '                               <span class="counter">20"</span>' +
                    '                           </li>' +
                    '                           <li class="play">' +
                    '                               <a href="#" id="videoRecorderPlayButton" style="display: none;">play</a>' +
                    '                           </li>' +
                    '                           <li class="emotion">' +
                    '                               <a href="#" class="sad" data-value="sad">Sad</a>' +
                    '                               <a href="#" class="normal selected" data-value="neutral">Neutral</a>' +
                    '                               <a href="#" class="happy" data-value="happy">Happy</a>' +
                    '                           </li>' +
                    '                           <li class="submitBtn">' +
                    '                               <input class="inputSubmit" type="submit" value="Submit"/>' +
                    '                           </li>' +
                    '                       </ul>' +
                    '                       <div id="ccUploadError" class="errors error" style="display: none;">Wait till the files are uploaded</div>' +
                    '                       <div id="ccVideoError" class="errors error" style="display: none;">You should record a video</div>' +
                    '                       <div id="ccTitleError" class="errors error" style="display: none;">You should add a title</div>' +
                    '                  </div>' +
                    '               </div>' +
                    '              <div id="buttonsLeft">' +
                    '                   <ul>' +
                    '                       <li><a id="youtubeButton" href="#" class="toggleElement" data-id="youtubeHolder"><span class="youtube"></span><span class="label">Add YouTube</span></a></li>' +
//                    '                       <li><a id="pinterestButton" href="#" class="toggleElement" data-id="pinterestHolder"><span class="pinterest"><span class="label">Add Pinterest</span></a></li>' +
                    '                       <li><a id="slideshareButton" href="#" class="toggleElement" data-id="slideshareHolder"><span class="slideshare"><span class="label">Add SlideShare</span></a></li>' +
                    '                       <li><a id="linkButton" href="#" class="toggleElement" data-id="linkHolder"><span class="link"></span><span class="label">Add link</span></a></li>' +
                    '                       <li><a id="soundcloudButton" href="#" class="toggleElement" data-id="soundcloudHolder"><span class="soundcloud"></span><span class="label">Add SoundCloud</span></a></li>' +
                    '                  </ul>' +
                    '               </div>' +
                    '               <div id="buttonsRight">' +
                    '                   <ul>' +
//                    '                    <li><a id="evernoteButton" href="#" class="toggleElement" data-id="evernoteHolder"><span class="evernote"></span><span class="label">Add Evernote</span></a></li>' +
                    '                       <li><a id="dropboxButton" href="#" class="" data-id="dropboxHolder"><span class="dropbox"></span><span class="label">Add Dropbox</span></a></li>' +
//                    '                       <li><a href="#" class="toggleElement" data-id="pinterestHolder"><span class="pinterest"></span><span class="label">Add Pinterest</span></a></li>' +
//                    '                       <li><a id="pictureButton" href="#" class="toggleElement" data-id="pictureHolder"><span class="picture"></span><span class="label">Add picture</span></a></li>' +
                    '                       <li><a id="fileButton" href="#" class="toggleElement" data-id="fileHolder"><span class="file"></span><span class="label">Add file</span></a></li>' +
                    '                  </ul>' +
                    '               </div>' +
                    '               <div id="youtubeHolder" class="element" style="display: none;">' +
                    '                   <label for="ccYoutubeEmbedCode" class="muted">Paste the embed code of the YouTube-video in the box below.</label>' +
                    '                   <textarea name="ccYoutubeEmbedCode" id="ccYoutubeEmbedCode" cols="80" rows="4"></textarea>' +
                    '               </div>' +
                    '               <div id="slideshareHolder" class="element" style="display: none;">' +
                    '                   <label for="ccSlideshareEmbedCode" class="muted">Paste the embed code of the SlideShare-item in the box below.</label>' +
                    '                   <textarea name="ccSlideshareEmbedCode" id="ccSlideshareEmbedCode" cols="80" rows="4"></textarea>' +
                    '               </div>' +
                    '               <div id="linkHolder" class="element" style="display: none;">' +
                    '                   <label for="ccUrl">Url</label>' +
                    '                   <input type="text" name="ccUrl" id="ccUrl">' +
                    '               </div>' +
                    '               <div id="soundcloudHolder" class="element" style="display: none;">' +
                    '                   <label for="ccSoundcloudEmbedCode" class="muted">Paste the embed code of the SoundCloud-item in the box below.</label>' +
                    '                   <textarea name="ccSoundcloudEmbedCode" id="ccSoundcloudEmbedCode" cols="80" rows="4"></textarea>' +
                    '               </div>' +
                    '               <div id="pictureHolder" class="element" style="display: none;">' +
                    '                   <label for="ccPicture">Picture</label>' +
                    '                   <input type="file" name="ccPicture" id="ccPicture">' +
                    '                  <input type="hidden" name="ccPictureId" id="ccPictureId">' +
                    '               </div>' +
                    '               <div id="fileHolder" class="element" style="display: none;">' +
                    '                   <label for="ccFile">File<span id="ccFilePercentage"></span></label>' +
                    '                   <input type="file" name="ccFile" id="ccFile">' +
                    '                 <input type="hidden" name="ccFileId" id="ccFileId">' +
                    '               </div>' +
                    '               <div id="dropboxHolder" class="element" style="display: none;">' +
                    '                   <input type="text" name="ccDropbox" id="ccDropbox">' +
                    '              </div>' +
                    '           </div>' +
                    '       </form>' +
					'   </div>' +
					'</div>';
        $('body').append(html);

        // set focus
        $('#ccTitle').focus();

        // init some vars
        var $creativeCommentsHolder = $('#creativeCommentsHolder');
        var $creativeCommentsForm = $('#creativeCommentsForm');

        // set it on the correct position
        $creativeCommentsHolder.css('top', $(window).scrollTop() + 20);

        // bind events
        $creativeCommentsForm.on('submit', creativeCommentsContent.submitForm);
        $('.toggleElement').on('click', creativeCommentsContent.toggleElement);
        $('.toggleYoutube').on('click', creativeCommentsContent.toggleYoutube);
        $('#creativeCommentsForm #videoRecorderRecordButton').on('click', creativeCommentsContent.video.startRecording);
        $('#creativeCommentsForm #videoRecorderPlayButton').on('click', creativeCommentsContent.video.playRecording);
        $('#dropboxButton').on('click', creativeCommentsContent.dropbox.open);
        $('#ccPicture').on('change', creativeCommentsContent.pictures.change);
        $('#ccFile').on('change', creativeCommentsContent.files.change);
        $('li.emotion a').on('click', function(e) {
            e.preventDefault();
            $('li.emotion a').removeClass('selected');
            $(this).addClass('selected');
        });

	    $('#ccYoutubeEmbedCode').on('change', function(e) {
		    if($(this).val() != '') $('#youtubeButton').addClass('complete');
		    else $('#youtubeButton').removeClass('complete');
	    });
	    $('#ccSlideshareEmbedCode').on('change', function(e) {
		    if($(this).val() != '') $('#slideshareButton').addClass('complete');
		    else $('#slideshareButton').removeClass('complete');
	    });
	    $('#ccSoundcloudEmbedCode').on('change', function(e) {
		    if($(this).val() != '') $('#soundcloudButton').addClass('complete');
		    else $('#soundcloudButton').removeClass('complete');
	    });
	    $('#ccUrl').on('change', function(e) {
		    if($(this).val() != '') $('#linkButton').addClass('complete');
		    else $('#linkButton').removeClass('complete');
	    });
	    $('#ccDropbox').on('change', function(e) {
		    if($(this).val() != '') $('#dropboxButton').addClass('complete');
		    else $('#dropboxButton').removeClass('complete');
	    });
    },

    showReport: function(message, type, close)
    {
        creativeCommentsContent.removeDialog();

        // build html
        var html =  '<div id="creativeCommentsHolder">' +
                    '   <div id="creativeCommentsMessage" class="message '+ type +'">' +
                    '        <div class="box">' +
                    '            <div class="logo">' +
                    '                <div class="icon">' +
                    '                </div>' +
                    '            </div>' +
                    '            <div class="content">' +
                    '                <p>' + message + '</p>' +
                    '                <a class="close">close</a>' +
                    '            </div>' +
                    '        </div>' +
                    '    </div>' +
                    '</div>';
        $('body').append(html);
        $('#creativeCommentsHolder').css('top', $(window).scrollTop() + 20);
        if(close) setTimeout(creativeCommentsContent.removeDialog, 3500);
    },

    submitForm: function(e)
    {
        // prevent default behaviour
        e.preventDefault();

        // title submitted?
        $('#ccTitleError').hide();
        if($('#creativeCommentsForm #ccTitle').val() == '') {
            $('#ccTitleError').show();
            return false;
        }
        // video submitted?
        $('#ccVideoError').hide();
        if(!creativeCommentsContent.video.hasRecorded) {
            $('#ccVideoError').show();
            return false;
        }

        // still uploading?
        $('#ccUploadError').hide();
        if(creativeCommentsContent.files.isUploading) {
            $('#ccUploadError').show();
            return false;
        }

        var data = {
            'access_token': creativeCommentsContent.getFromStore('access_token'),
            'method': 'comments.add',
            'title': $('#creativeCommentsForm #ccTitle').val(),
            'text': $('#creativeCommentsForm #ccText').val(),
	        'emotion': $('#creativeCommentsForm .emotion a.selected').data('value'),
	        'youtube': $('#creativeCommentsForm #ccYoutubeEmbedCode').val(),
            'slideshare': $('#creativeCommentsForm #ccSlideshareEmbedCode').val(),
            'soundcloud': $('#creativeCommentsForm #ccSoundcloudEmbedCode').val(),
            'url': $('#creativeCommentsForm #ccUrl').val(),
            'dropbox': $('#creativeCommentsForm #ccDropbox').val(),
            'video_id': creativeCommentsContent.video.streamName,
            'file_id': $('#creativeCommentsForm #ccFileId').val(),
            'picture_id': $('#creativeCommentsForm #ccPictureId').val()
        };

        $.ajax({
            data: data,
            success: function(data, textStatus, jqXHR)
            {
                creativeCommentsContent.removeDialog();
                var url = creativeCommentsContent.siteUrl + data.data.fullUrl;
                var message = 'Check the full comment on: ' + url;
                creativeCommentsContent.setContent(creativeCommentsContent.clickedElement, message);
                creativeCommentsContent.showReport('Comment was saved, make sure you include <a href="' + url + '">' + url + '</a> in the comment. And don\'t forget to press enter.', 'success', true);
                creativeCommentsContent.showTooltip = false;
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
        var $element = $('#' + $(this).data('id'));

        // hide other elements
        $('.element').each(function() {
            if($(this).attr('id') != $element.attr('id')) $(this).hide();
            if($(this).hasClass('removeContent')) $(this).html('');
        });

        if($element.is(':visible')) $element.hide();
        else {
	        $element.show();
			$('html, body').stop().animate({
				scrollTop: $element.offset().top
			}, 1000);
        }
    },

    toggleYoutube: function(e)
    {
        e.preventDefault();
        var $element = $('#' + $(this).data('id'));
        // hide other elements
        $('.element').each(function() {
            if($(this).attr('id') != $element.attr('id')) $(this).hide();
            if($(this).hasClass('removeContent')) $(this).html('');
        });

        if($element.is(':visible')) {
            $element.hide();
            $element.html('');
        } else {
            var youtubeId = $(this).data('ytId');
            $element.html('<iframe width="610" height="450" src="http://www.youtube.com/embed/' + youtubeId + '?rel=0&autoplay=1" frameborder="0" allowfullscreen></iframe>');
            $element.show();
        }
    }
}

creativeCommentsContent.dropbox = {
    open: function(e) {

        creativeCommentsContent.window.Dropbox.appKey = 'dho03wi5xqxe3s8';
        creativeCommentsContent.window.Dropbox.choose({
            success: function(files) {
	            $('#ccDropbox').val(files[0].link).change();
            },
            cancel: function() {
            }
        });
    }
}

creativeCommentsContent.files = {
    isUploading: false,
    change: function(e) {
        var file = document.getElementById('ccFile').files[0];
        var reader = new FileReader();
        reader.readAsText(file, 'UTF-8');
        reader.onload = creativeCommentsContent.files.upload;
        reader.onprogress =creativeCommentsContent.files.progress;
    },
    progress: function(e) {
        var percentLoaded = Math.round((e.loaded / e.total) * 100);
        // Increase the progress bar length.
        if (percentLoaded <= 100) {
            $('#ccFilePercentage').html(' ' + percentLoaded +'%');
        }

        creativeCommentsContent.files.isUploading = true;
        $('#commentControls .inputSubmit').prop('disabled', true);
    },
    upload: function(e) {
        var result = event.target.result;
        var fileName = document.getElementById('ccFile').files[0].name;
        $.post(
            creativeCommentsContent.apiUrl,
            {
                data: result,
                name: fileName,
                method: 'comments.uploadTemporaryFile',
                access_token: creativeCommentsContent.getFromStore('access_token')
            },
            function(data) {
                if(data.code == 200) {
                    $('#ccFilePercentage').html(' ' + fileName + ' uploaded');
                    creativeCommentsContent.files.isUploading = false;
                    $('#commentControls .inputSubmit').prop('disabled', false);
                    $('#ccUploadError').hide();
                    $('#ccFileId').val(data.data.id);
	                $('#fileButton').addClass('complete');
                } else {
                    creativeCommentsContent.showReport(data.message, 'error');
                }
            }
        );
    }
}

creativeCommentsContent.pictures = {
    isUploading: false,
    change: function(e) {
        var file = document.getElementById('ccPicture').files[0];
        var reader = new FileReader();
        reader.readAsText(file, 'UTF-8');
        reader.onload = creativeCommentsContent.pictures.upload;
        reader.onprogress =creativeCommentsContent.pictures.progress;
    },
    progress: function(e) {
        var percentLoaded = Math.round((e.loaded / e.total) * 100);
        // Increase the progress bar length.
        if (percentLoaded <= 100) {
            $('#ccPicturePercentage').html(' ' + percentLoaded +'%');
        }

        creativeCommentsContent.pictures.isUploading = true;
        $('#commentControls .inputSubmit').prop('disabled', true);
    },
    upload: function(e) {
        var result = event.target.result;
        var fileName = document.getElementById('ccPicture').files[0].name;
        $.post(
            creativeCommentsContent.apiUrl,
            {
                data: result,
                name: fileName,
                method: 'comments.uploadTemporaryImage',
                access_token: creativeCommentsContent.getFromStore('access_token')
            },
            function(data) {
                if(data.code == 200) {
                    $('#ccPicturePercentage').html(' ' + fileName + ' uploaded');
                    creativeCommentsContent.pictures.isUploading = false;
                    $('#commentControls .inputSubmit').prop('disabled', false);
                    $('#ccUploadError').hide();
                    $('#ccPictureId').val(data.data.id);
	                $('#pictureButton').addClass('complete');
                } else {
                    creativeCommentsContent.showReport(data.message, 'error');
                }
            }
        );
    }
}

creativeCommentsContent.messages = {
    receive: function(e) {
        var method = e.data.method;
        if(typeof method == 'undefined') return;

        switch(method) {
            case 'videorecorder.savedRecording':
                creativeCommentsContent.video.instance.postMessage(
                    { method: 'videorecorder.getStreamName' },
                    creativeCommentsContent.siteUrl
                );
            break;
            case 'videorecorder.startedRecording':
                creativeCommentsContent.video.currentTime = 0;
                creativeCommentsContent.video.update();
                $('#creativeCommentsForm #startRecording').html('Stop recording');
                $('#videoRecorderRecordButton').addClass('recording');
                creativeCommentsContent.video.recording = true;
            break;
            case 'videorecorder.stoppedRecording':
                creativeCommentsContent.video.stopRecording();
            break;
            case 'videorecorder.notAllowed':
                creativeCommentsContent.showReport('To record a video we need access to your webcam.', 'error');
            break;
            case 'videorecorder.saveOk':
                creativeCommentsContent.streamName = e.data.streamName;
            break;
            default:
                console.log(e);
        }
    }
}

creativeCommentsContent.video = {
    instance: null,
    maxTime: 20,
    timer: null,
    currentTime: 0,
    streamName: null,
    recording: false,
    hasRecorded: false,

    init: function() {
	    creativeCommentsContent.video.instance = document.getElementById('videoRecorderHolder').contentWindow;
    },

	playRecording: function(e) {
		$('#videoRecorderHolder').hide();
		$('#videoPlayerHolder').attr('src', creativeCommentsContent.siteUrl + '/en/api/player/?id=' + creativeCommentsContent.video.streamName).show();
	},

    startRecording: function(e) {
	    $('#videoRecorderHolder').show();
	    $('#videoPlayerHolder').hide();

        if(creativeCommentsContent.video.instance == null) creativeCommentsContent.video.init();

        if(creativeCommentsContent.video.recording) {
            creativeCommentsContent.video.instance.postMessage(
                { method: 'videorecorder.stopRecording' },
                creativeCommentsContent.siteUrl
            );
        } else {
            creativeCommentsContent.video.instance.postMessage(
                { method: 'videorecorder.startRecording' },
                creativeCommentsContent.siteUrl
            );
            creativeCommentsContent.video.currentTime = 0;
            creativeCommentsContent.video.updateCounter();
        }

	    $('#videoRecorderPlayButton').hide();
    },

    stopRecording: function(e) {
        clearTimeout(creativeCommentsContent.video.timer);
        creativeCommentsContent.video.instance.postMessage(
            { method: 'videorecorder.saveRecording' },
            creativeCommentsContent.siteUrl
        );
        $('#creativeCommentsForm #startRecording').html('Start recording');
        $('#videoRecorderRecordButton').removeClass('recording');
        creativeCommentsContent.video.recording = false;
        creativeCommentsContent.video.hasRecorded = true;

	    $('#videoRecorderPlayButton').show();
    },

    update: function() {
        if(creativeCommentsContent.video.currentTime >= 20) {
            creativeCommentsContent.video.stopRecording();
            creativeCommentsContent.video.currentTime = 20;
        } else {
            creativeCommentsContent.video.currentTime += 1;
            creativeCommentsContent.video.timer = setTimeout(creativeCommentsContent.video.update, 1000);
        }
        creativeCommentsContent.video.updateCounter();
    },
    updateCounter: function() {
        $('#commentControls span.counter').html(
            (creativeCommentsContent.video.maxTime - creativeCommentsContent.video.currentTime) + '"'
        );
    }
}

creativeCommentsContent.init();
window.addEventListener("message", creativeCommentsContent.messages.receive, false);