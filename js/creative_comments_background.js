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
        chrome.tabs.sendRequest(
            tab.id,
            'creativeCommentsContent.isAllowedUrl',
            function(data) {
                if(data.allowed) {
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
                } else {
                    alert('You can\'t create Creative Comments outside Facebook (for now).');
                }
            }
        );
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
