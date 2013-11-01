/**
 * @module App
 * @submodule layouts/Layout
 */
define(['backbone'], function(BB) {

	/**
	 * Layout abstract class
	 * @class Layout
	 * @constructor
	 * @extends Backbone.View
	 */
	var Layout = BB.View.extend({

		/**
		 * Gives focus to layout region element
		 * @method setFocus
		 * @param name {String} Name of the region
		 */
		setFocus: function(name) {
			if (!name || !this[name]) return;
			this[name].el.focus();
		},

		/**
		 * Appends new region to layout.
		 * If existing name is used, the old region is replaced with the new region
		 * and 'close' event is triggered on the old region
		 * @method attach
		 * @param name {String} Name of the region
		 * @param view {Backbone.View} Backbone view to be the attached region
		 */
		attach: function(name, view) {
			var old = this[name];

			this[name] = view;
			if (!view.el.parentNode) {
				if (old && old instanceof BB.View) {
					old.$el.replaceWith(view.el);
					old.trigger('close');
				} else {
					this.$el.append(view.el);
				}
			}
			view.trigger('attach');
			if (!this.focus) this.setFocus(name);
		}
	});

	return Layout;
});