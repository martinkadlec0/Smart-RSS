let list;

const init = () => {
    document.addEventListener('click', (event) => {
        if (event.target.matches('li')) {
            return copyLink(event);
        }
        return true;
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

const copyLink = (event) => {
    const textArea = document.createElement('textarea');
    console.log(event.target.getAttribute('data-url'));
    textArea.value = event.target.getAttribute('data-url');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.body.style.minWidth = document.body.offsetWidth + 'px';
    if (document.execCommand('copy')) {
        document.body.innerHTML = '<p>URL was copied to the clipboard!<p>';
    } else {
        document.body.innerHTML = '<p>URL copying failed.<p>';
    }
    document.body.addEventListener('click', closePopup);
    setTimeout(closePopup, 5e3);
    event.stopPropagation();
};


const renderButton = (data) => {
    const element = document.createElement('li');
    element.setAttribute('data-url', data.url);
    element.innerHTML = '• ' + data.title;
    list.appendChild(element);
};

const handleData = (message, sender, sendResponse) => {
    document.body.removeEventListener('click', closePopup);
    if (message.action === 'response-list') {
        message.value.forEach(renderButton);
    }
};


const closePopup = () => {
    window.close();
};

