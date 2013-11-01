define(['backbone', 'views/TopView', 'instances/contextMenus'], function(BB, TopView, contextMenus) {
	var SourceView = TopView.extend({
		/*events: {
			'mouseup': 'handleMouseUp',
			'click': 'handleMouseDown',
		},*/
		className: 'list-item source',
		list: null,
		initialize: function(opt, list) {
			this.list = list;
			this.el.setAttribute('draggable', 'true');
			this.model.on('change', this.render, this);
			this.model.on('destroy', this.handleModelDestroy, this);
			this.model.on('change:title', this.handleChangeTitle, this);
			bg.sources.on('clear-events', this.handleClearEvents, this);
			this.el.dataset.id = this.model.get('id');
			this.el.view = this;
		},
		handleClearEvents: function(id) {
			if (window == null || id == tabID) {
				this.clearEvents();
			}
		},
		clearEvents: function() {
			this.model.off('change', this.render, this);
			this.model.off('destroy', this.handleModelDestroy, this);
			this.model.off('change:title', this.handleChangeTitle, this);
			bg.sources.off('clear-events', this.handleClearEvents, this);
		},
		showContextMenu: function(e) {
			if (!this.$el.hasClass('selected')) {
				app.feeds.feedList.select(this, e);
			}
			contextMenus.get('source').currentSource = this.model;
			contextMenus.get('source').show(e.clientX, e.clientY);
		},
		handleChangeTitle: function() {
			this.list.placeSource(this);
		},
		handleModelDestroy: function() {
			this.list.destroySource(this);
		},
		renderInterval: 'first-time',
		render: function() {
			if (this.renderInterval == 'first-time') return this.realRender();
			if (this.renderInterval) return this;
			
			var that = this;
			this.renderInterval = requestAnimationFrame(function() {
				that.realRender();
			});
			return this;
		},
		realRender: function() {
			this.$el.toggleClass('has-unread', !!this.model.get('count'));

			if (this.model.get('folderID')) {
				this.el.dataset.inFolder = this.model.get('folderID');
			} else {
				this.$el.removeClass('invisible');
				delete this.el.dataset.inFolder;
			}

			this.setTitle(this.model.get('count'), this.model.get('countAll'));
			
			this.$el.html(this.template(this.model.toJSON()));
			this.renderInterval = null;

			return this;
		}
	});

	return SourceView;
});