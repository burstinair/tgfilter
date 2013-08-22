chrome.browserAction.onClicked.addListener(function (tab) {
    chrome.tabs.insertCSS(null, {file: "style.css"});
    chrome.tabs.executeScript(null, {file: "zepto.js"});
    chrome.tabs.executeScript(null, {file: "content.js"});
});