/**
 * @module BgProcess
 * @submodule collections/Folders
 */
define(['backbone', 'models/Folder', 'preps/indexeddb'], function (BB, Folder) {

    /**
     * Collection of feed folders
     * @class Folders
     * @constructor
     * @extends Backbone.Collection
     */
    return BB.Collection.extend({
        model: Folder,
        localStorage: new Backbone.LocalStorage('folders-backbone'),
        comparator: function (a, b) {
            const t1 = (a.get('title') || '').trim().toLowerCase();
            const t2 = (b.get('title') || '').trim().toLowerCase();
            return t1 < t2 ? -1 : 1;
        }
    });
});