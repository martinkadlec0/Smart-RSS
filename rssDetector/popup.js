/* globals browser */

let list;

const init = () => {
    document.addEventListener('click', (event) => {
        if (event.target.matches('li')) {

            return handleLinkClick(event);
        }
    }, false);
    chrome.tabs.query({active: true, lastFocusedWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'get-list'}, handleData);
    });
    list = document.querySelector('ul');
};


if (document.readyState === 'complete') {
    init();
} else {
    document.addEventListener('DOMContentLoaded', function () {
        init();
    });
}

const handleLinkClick = (event) => {
    document.body.addEventListener('click', closePopup);
    setTimeout(closePopup, 5e3);
    event.stopPropagation();
    if (browser) {
        return browser.runtime.sendMessage({action: 'new-rss', value: event.target.getAttribute('data-url')});
    }
    // TODO: get ids of Chromium and Chropera extensions and send message to them

    const textArea = document.createElement('textarea');
    textArea.value = event.target.getAttribute('data-url');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.body.style.minWidth = document.body.offsetWidth + 'px';
    while (document.body.firstChild) {
        document.body.removeChild(document.body.firstChild);
    }
    if (document.execCommand('copy')) {
        document.body.insertAdjacentHTML('beforeend', '<p>URL was copied to the clipboard!<p>');
    } else {
        document.body.insertAdjacentHTML('beforeend', '<p>URL copying failed.<p>');
    }
};


const renderButton = (data) => {
    const element = document.createElement('li');
    element.setAttribute('data-url', data.url);
    element.textContent = '• ' + data.title;
    list.appendChild(element);
};

const handleData = (message) => {
    document.body.removeEventListener('click', closePopup);
    if (message.action === 'response-list') {
        message.value.forEach(renderButton);
    }
};


const closePopup = () => {
    window.close();
};

