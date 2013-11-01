define(['backbone'], function(BB) {
	var GroupView = BB.View.extend({
		tagName: 'div',
		className: 'date-group',
		initialize: function(model, groups) {
			this.el.view = this;
			this.listenTo(groups, 'reset', this.handleReset);
			this.listenTo(groups, 'remove', this.handleRemove);
		},
		render: function() {
			this.$el.html(this.model.get('title'));
			return this;
		},
		handleRemove: function(model) {
			if (model == this.model) {
				this.handleReset();
			}
		},
		handleReset: function() {
			this.stopListening();
			this.$el.remove();
		}
	});

	return GroupView;
});