/**
 * @module BgProcess
 * @submodule modules/toDataURI
 */
define([], function () {
    async function checkFavicon(source) {
        return new Promise((resolve, reject) => {
            const baseUrl = new URL(source.get('base'));
            const hostBaseAddress = baseUrl.origin;

            async function getFaviconAddress(baseUrl) {
                return new Promise((resolve, reject) => {
                    if (settings.get('faviconSource') === 'duckduckgo') {
                        resolve('https://icons.duckduckgo.com/ip3/' + baseUrl + '.ico');
                        return;
                    }

                    if (settings.get('faviconsSource') === 'google') {
                        resolve('https://www.google.com/s2/favicons?domain=' + baseUrl);
                        return;
                    }

                    let xhr = new XMLHttpRequest();
                    xhr.ontimeout = () => {
                        reject('timeout');
                    };
                    xhr.onloadend = () => {
                        if (xhr.readyState !== 4) {
                            reject('network error');
                            return;
                        }
                        if (xhr.status !== 200) {
                            reject('non-200');
                            return;
                        }
                        const baseDocumentContents = xhr.responseText.replace(/<body(.*?)<\/body>/gm, '');
                        const baseDocument = new DOMParser().parseFromString(baseDocumentContents, 'text/html');
                        let iconAddress = hostBaseAddress + '/favicon.ico';
                        const links = baseDocument.querySelectorAll('link');
                        const iconLinks = Array.from(links).filter(link => {
                            return link.hasAttribute('rel') && link.getAttribute('rel').includes('icon');
                        });
                        let size = 0;
                        let tempIcon = '';
                        iconLinks.some((link) => {
                            if (size === 16) {
                                return false;
                            }
                            tempIcon = link.getAttribute('href');
                            if (!tempIcon) {
                                return false;
                            }
                            if (tempIcon.includes('svg')) {
                                return false;
                            }
                            const localSize = link.getAttribute('sizes');
                            if (!localSize) {
                                if (size === 0) {
                                    iconAddress = tempIcon;
                                }
                                return false;
                            }
                            const side = parseInt(localSize.split('x')[0]);
                            if (side === 16) {
                                size = side;
                                iconAddress = tempIcon;
                                return true;
                            }
                            if (side < size) {
                                return false;
                            }
                            size = side;
                            iconAddress = tempIcon;
                        });

                        if (!iconAddress.includes('//')) {
                            if (iconAddress[0] === '.') {
                                iconAddress = iconAddress.substr(1);
                            }
                            if (iconAddress[0] === '/') {
                                iconAddress = iconAddress.substr(1);
                            }
                            iconAddress = hostBaseAddress + '/' + iconAddress;
                        }
                        if (iconAddress.startsWith('//')) {
                            iconAddress = baseUrl.protocol + iconAddress;
                        }

                        resolve(iconAddress);

                    };
                    xhr.open('GET', hostBaseAddress);
                    xhr.timeout = 1000 * 30;
                    xhr.send();
                });
            }

            getFaviconAddress(hostBaseAddress)
                .then((faviconAddress) => {
                    toDataURI(faviconAddress)
                        .then(response => {
                            resolve(response);
                        })
                        .catch(() => {
                            reject();
                        });
                });
        });
    }


    // /**
    //  * Image specific data URI converter
    //  * @class toDataURI
    //  * @constructor
    //  * @extends Object
    //  */
    function toDataURI(url) {
        return new Promise(function (resolve, reject) {
            const xhr = new window.XMLHttpRequest();
            xhr.responseType = 'arraybuffer';
            xhr.onerror = function () {
                reject('[modules/toDataURI] XMLHttpRequest error on', url);
            };
            xhr.ontimeout = () => {
                reject('timeout');
            };
            xhr.onloadend = function () {
                if (xhr.readyState !== XMLHttpRequest.DONE) {
                    reject('[modules/toDataURI] XMLHttpRequest error on', url);
                    return;
                }
                if (xhr.status !== 200) {
                    reject('[modules/toDataURI] XMLHttpRequest error on', url);
                    return;
                }
                const type = xhr.getResponseHeader('content-type');
                if (!~type.indexOf('image') || xhr.response.byteLength < 10) {
                    reject('[modules/toDataURI] Not an image on', url);
                    return;
                }
                let expires = 0;
                const expiresHeader = xhr.getResponseHeader('expires');
                if (expiresHeader) {
                    expires = parseInt(Math.round((new Date(expiresHeader)).getTime() / 1000));
                } else {
                    const cacheControlHeader = xhr.getResponseHeader('cache-control');
                    let maxAge = 60 * 60 * 24 * 7;
                    if (cacheControlHeader && cacheControlHeader.includes('max-age=')) {
                        const newMaxAge = parseInt(/max-age=([0-9]+).*/gi.exec(cacheControlHeader)[1]);
                        maxAge = newMaxAge > 0 ? newMaxAge : maxAge;
                    }
                    expires = parseInt(Math.round((new Date()).getTime() / 1000)) + maxAge;
                }

                const imgData = 'data:' + type + ';base64,' + AB2B64(xhr.response);
                resolve({favicon: imgData, faviconExpires: expires});
            };
            xhr.open('GET', url);
            xhr.timeout = 1000 * 30;
            xhr.send();
        });
    }


    /* Custom Base64 encoder. */
    function AB2B64(arrayBuffer) {
        let base64 = '';
        const encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

        const bytes = new Uint8Array(arrayBuffer);
        const byteLength = bytes.byteLength;
        const byteRemainder = byteLength % 3;
        const mainLength = byteLength - byteRemainder;

        let a, b, c, d;
        let chunk;

        for (let i = 0; i < mainLength; i = i + 3) {
            chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];

            a = (chunk & 16515072) >> 18; // 16515072 = (2^6 - 1) << 18
            b = (chunk & 258048) >> 12; // 258048   = (2^6 - 1) << 12
            c = (chunk & 4032) >> 6; // 4032     = (2^6 - 1) << 6
            d = chunk & 63; // 63       = 2^6 - 1

            base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d];
        }

        if (byteRemainder === 1) {
            chunk = bytes[mainLength];

            a = (chunk & 252) >> 2; // 252 = (2^6 - 1) << 2
            b = (chunk & 3) << 4; // 3   = 2^2 - 1

            base64 += encodings[a] + encodings[b] + '==';
        } else if (byteRemainder === 2) {
            chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];

            a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
            b = (chunk & 1008) >> 4; // 1008  = (2^6 - 1) << 4
            c = (chunk & 15) << 2; // 15    = 2^4 - 1

            base64 += encodings[a] + encodings[b] + encodings[c] + '=';
        }

        return base64;
    }

    return {
        image: function () {
            return toDataURI.apply(null, arguments);
        },
        checkFavicon: function () {
            return checkFavicon.apply(null, arguments);
        }
    };
});
