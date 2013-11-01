define(['backbone', 'views/ToolbarButtonView', 'collections/ToolbarButtons'],
	function (BB, ToolbarButtonView, ToolbarButtons) {
		var ToolbarView = BB.View.extend({
			tagName: 'div',
			className: 'toolbar',
			buttonPosition: 'left',
			buttons: null,
			events: {
				'click .button': 'handleButtonClick',
				'input input[type=search]': 'handleButtonClick'
			},
			initialize: function() {
				this.el.view = this;
				this.buttons = new ToolbarButtons();

				this.listenTo(this.buttons, 'add', this.addButton);

				this.model.get('actions').forEach(this.createButton, this);
			},
			createButton: function(action) {
				if (action == '!right')	{
					this.buttonPosition = 'right';
					return null;
				}
				this.buttons.add({ actionName: action, position: this.buttonPosition });
			},
			handleButtonClick: function(e) {
				var button = e.currentTarget.view.model;
				app.actions.execute(button.get('actionName'), e);
			},
			render: function() {
				return this;
			},
			addButton: function(button) {
				var view = new ToolbarButtonView({ model: button });
				this.$el.append(view.render().el);
			}
		});

		return ToolbarView;
	}
);