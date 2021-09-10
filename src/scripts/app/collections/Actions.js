/**
 * @module App
 * @submodule collections/Actions
 */
define(function (require) {
    const BB = require('backbone');
    const Action = require('models/Action');
    const actions = require('staticdb/actions');

    /**
     * Collection of executable actions. Actions are usually executed by shortcuts, buttons or context menus.
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
            Object.keys(actions).forEach((region) => {
                Object.keys(actions[region]).forEach((name) => {
                    const c = actions[region][name];
                    this.add({name: region + ':' + name, fn: c.fn, icon: c.icon, title: c.title});
                });
            });
        },

        /**
         * Executes given action
         * @method execute
         * @param action {string|models/Action}
         */
        execute: function (action) {
            if (typeof action === 'string') {
                action = this.get(action);
            }
            if (!action) {
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
