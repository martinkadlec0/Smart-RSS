/**
 * @module BgProcess
 * @submodule models/Settings
 */
define(['backbone', 'preps/indexeddb'], function(BB) {
    /**
     * Test navigator.language and if it matches some avalable language
     */
    function getLangFromNavigator() {
        const ln = String(navigator.language)
        .split('-')[0];
        const available = ['en', 'cs', 'sk', 'de', 'tr', 'pl', 'ru', 'hu', 'nl', 'fr', 'pt', 'hr'];
        const index = available.indexOf(ln);
        if (index >= 0) {
            return available[index];
        }
        return 'en';
    }
    /**
     * User settings
     * @class Settings
     * @constructor
     * @extends Backbone.Model
     */
    let Settings = BB.Model.extend({
        defaults: {
            id: 'settings-id',
            lang: getLangFromNavigator(),
            dateType: 'normal', // normal = DD.MM.YYYY, ISO = YYYY-MM-DD, US = MM/DD/YYYY
            layout: 'horizontal', // or vertical
            lines: 'auto', // one-line, two-lines
            posA: '250,*',
            posB: '350,*',
            posC: '50%,*',
            sortOrder: 'desc',
            sortOrder2: 'asc',
            icon: 'orange',
            readOnVisit: false,
            askOnOpening: true,
            fullDate: false,
            hoursFormat: '24h',
            articleFontSize: '100',
            uiFontSize: '100',
            disableDateGroups: false,
            badgeMode: 'disabled',
            circularNavigation: true,
            sortBy: 'date',
            sortBy2: 'title',
            askRmPinned: 'trashed',
            titleIsLink: true,
            soundNotifications: false,
            defaultSound: '',
            useSound: ':user',
            soundVolume: 1, // min: 0, max: 1
            showSpinner: true,
            concurrentDownloads: 5,
            updateFrequency: 15, // in minutes
            disableAutoUpdate: false
        },
        /**
         * @property localStorage
         * @type Backbone.IndexedDB
         * @default *settings-backbone*
         */
        indexedDB: new Backbone.IndexedDB('settings-backbone')
    });
    return Settings;
});
