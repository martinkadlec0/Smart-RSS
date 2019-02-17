/**
 * @module App
 * @submodule collections/Actions
 */
define(['backbone', 'models/Action', 'staticdb/actions'], function (BB, Action, db) {

    /**
     * Collection of executable actions. Actions are usually executed by shorcuts, buttons or context menus.
     * @class Actions
     * @constructor
     * @extends Backbone.Collection
     */
    const Actions = BB.Collection.extend({
        model: Action,

        /**
         * @method initialize
         */
        initialize: function () {
            Object.keys(db).forEach(function (region) {
                Object.keys(db[region]).forEach(function (name) {
                    const c = db[region][name];
                    this.add({name: region + ':' + name, fn: c.fn, icon: c.icon, title: c.title});
                }, this);
            }, this);
        },

        /**
         * Executes given action
         * @method execute
         * @param action {string|models/Action}
         */
        execute: function (action) {
            if (typeof action == 'string') {
                action = this.get(action);
            }
            if (!action) {
                console.log('Action "' + action + '" does not exists');
                return false;
            }
            const args = [].slice.call(arguments);
            args.shift();
            action.get('fn').apply(app, args);
            return true;
        }
    });

    return Actions;
});