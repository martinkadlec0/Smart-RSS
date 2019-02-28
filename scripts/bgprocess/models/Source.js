/**
 * @module BgProcess
 * @submodule models/Source
 */
define(['backbone'], function (BB) {

    /**
     * Feed module
     * @class Source
     * @constructor
     * @extends Backbone.Model
     */
    var Source = BB.Model.extend({
        defaults: {
            title: '',
            url: 'about:blank',
            base: '',
            updateEvery: -1, // in minutes, -1 to use global default
            lastUpdate: 0,
            count: 0, // unread
            countAll: 0,
            username: '',
            password: '',
            hasNew: false,
            isLoading: false,
            autoremove: 0, // in days
            proxyThroughFeedly: false,
            favicon: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==',
            faviconExpires: 0
        },

        initialize: function () {
            this.set('isLoading', false);
        },

        getPass: function () {
            var str = this.get('password');
            if (str.indexOf('enc:') !== 0) return str;

            var dec = '';
            for (var i = 4; i < str.length; i++) {
                dec += String.fromCharCode(str.charCodeAt(i) - 13);
            }
            return dec;
        },
        setPass: function (str) {
            if (!str) {
                this.save('password', '');
                return;
            }

            var enc = 'enc:';
            for (var i = 0; i < str.length; i++) {
                enc += String.fromCharCode(str.charCodeAt(i) + 13);
            }
            this.set('password', enc);
        }

    });

    return Source;
});