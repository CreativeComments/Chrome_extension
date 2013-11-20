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

        /**
         * Listen to message from content to catch the copyToClipboard action
         */
        chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
            if (request.copyToClipboard) {
                creativeCommentsBackground.copyToClipboard(request.copyToClipboard);
            }
        });

    },

    click: function(info, tab)
    {
        if (
            tab.url.indexOf('facebook.com') < 0 &&
                tab.url.indexOf('twitter.com') < 0
            ) {
            alert('At this moment you can not create a Creative Comment outside Twitter.com or Facebook.com.');
        }

        else {
            // on click we should ask our content.js-files which item was clicked
            chrome.tabs.sendRequest(
                tab.id,
                'creativeCommentsContent.getClickedItem',
                function(data)
                {
                    // show the form
                    chrome.tabs.executeScript(
                        tab.id,
                        { code: 'creativeCommentsContent.openForm("' + data.id + '")' }
                    );
                }
            );
        }
    },

    createContextMenu: function()
    {
        // create the context menu
        creativeCommentsBackground.id = chrome.contextMenus.create({
            'title':    'Creative Comments',
            'contexts': ['editable'],
            'onclick':  creativeCommentsBackground.click
        });
    },

    /**
     * Puts the given text in clipboard
     * @param text
     */
    copyToClipboard: function (text) {
        var textarea = document.getElementById('clipboard');
        textarea.innerHTML = text;
        textarea.select();
        document.execCommand('Copy', false, null);
    }

}

creativeCommentsBackground.init();
