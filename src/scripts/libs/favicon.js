/**
 * @module BgProcess
 * @submodule modules/toDataURI
 */
define(function () {
    async function getFavicon(source) {
        return new Promise((resolve, reject) => {
            async function getFaviconAddress(source) {
                const baseUrl = new URL(source.get('base'));
                return new Promise((resolve, reject) => {
                    if (settings.get('faviconSource') === 'duckduckgo') {
                        resolve('https://icons.duckduckgo.com/ip3/' + baseUrl.host + '.ico');
                        return;
                    }

                    if (settings.get('faviconsSource') === 'google') {
                        resolve('https://www.google.com/s2/favicons?domain=' + baseUrl.host);
                        return;
                    }

                    let xhr = new XMLHttpRequest();
                    xhr.ontimeout = () => {
                        reject('timeout');
                    };
                    xhr.onloadend = () => {
                        if (xhr.readyState !== XMLHttpRequest.DONE) {
                            reject('network error');
                            return;
                        }
                        if (xhr.status !== 200) {
                            reject('Encountered non-200 response trying to parse ' + baseUrl.origin);
                            return;
                        }
                        const baseDocumentContents = xhr.responseText.replace(/<body(.*?)<\/body>/gm, '');
                        const baseDocument = new DOMParser().parseFromString(baseDocumentContents, 'text/html');
                        const linkElements = [...baseDocument.querySelectorAll('link[rel*="icon"][href]')];

                        const links = new Set();
                        links.add(baseUrl.origin + '/favicon.ico');

                        linkElements.forEach((linkElement) => {
                            const faviconAddress = linkElement.getAttribute('href');
                            if (!faviconAddress) {
                                return;
                            }
                            if (faviconAddress.includes('svg')) {
                                return;
                            }
                            if (faviconAddress.startsWith('http')) {
                                return links.add(faviconAddress);
                            }
                            if (faviconAddress.startsWith('//')) {
                                return links.add(baseUrl.protocol + faviconAddress);
                            }
                            if (faviconAddress.startsWith('data')) {
                                return links.add(faviconAddress);
                            }
                            if (faviconAddress.startsWith('/')) {
                                return links.add(baseUrl.origin + faviconAddress);
                            }

                            links.add(baseUrl.origin + '/' + faviconAddress);
                        });


                        resolve([...links]);
                    };

                    xhr.open('GET', baseUrl.origin);
                    xhr.timeout = 1000 * 30;
                    xhr.send();
                });
            }

            getFaviconAddress(source)
                .then((faviconAddresses) => {
                    const promises = faviconAddresses.map((favicon) => {
                        return toDataURI(favicon);
                    });
                    Promise.any(promises)
                        .then((dataURI) => {
                            resolve(dataURI);
                        }).catch((errors) => {
                        reject(errors);
                    });
                })
                .catch((error) => {
                    reject(error);
                });
        });
    }


    // /**
    //  * Image specific data URI converter
    //  * @class toDataURI
    //  * @constructor
    //  * @extends Object
    //  */
    function toDataURI(favicon) {
        return new Promise((resolve, reject) => {
            if (favicon.startsWith('data')) {
                resolve(favicon);
            }
            const xhr = new window.XMLHttpRequest();
            xhr.responseType = 'arraybuffer';
            xhr.onerror = () => {
                reject('[modules/toDataURI] error on: ' + favicon);
            };
            xhr.ontimeout = () => {
                reject('timeout');
            };
            xhr.onloadend = function () {
                if (xhr.readyState !== XMLHttpRequest.DONE) {
                    reject('[modules/toDataURI] network error on: ' + favicon);
                    return;
                }
                if (xhr.status !== 200) {
                    reject('[modules/toDataURI] non-200 on: ' + favicon);
                    return;
                }

                const imageDataUri = getImageData(xhr);
                if (!imageDataUri) {
                    reject('[modules/toDataURI] Not an image on: ' + favicon);
                }

                const expiresHeader = xhr.getResponseHeader('expires');

                let expires = 0;
                if (expiresHeader) {
                    expires = Math.round((new Date(expiresHeader)).getTime() / 1000);
                } else {
                    const cacheControlHeader = xhr.getResponseHeader('cache-control');
                    let maxAge = 60 * 60 * 24 * 7;
                    if (cacheControlHeader && cacheControlHeader.includes('max-age=')) {
                        const newMaxAge = parseInt(/max-age=([0-9]+).*/gi.exec(cacheControlHeader)[1]);
                        maxAge = newMaxAge > 0 ? newMaxAge : maxAge;
                    }
                    expires = Math.round((new Date()).getTime() / 1000) + maxAge;
                }

                resolve({favicon: imageDataUri, faviconExpires: expires});
            };
            xhr.open('GET', favicon);
            xhr.timeout = 1000 * 30;
            xhr.send();
        });
    }

    function getImageData(xhr) {
        const type = xhr.getResponseHeader('content-type');
        if (!~type.indexOf('image') || xhr.response.byteLength < 10) {
            return;
        }

        const array = new Uint8Array(xhr.response);
        const raw = String.fromCharCode.apply(null, array);

        return 'data:' + type + ';base64,' + btoa(raw);
    }

    return {
        image: toDataURI,
        getFavicon: getFavicon
    };
});
