define([
	'views/ToolbarButtonView', 'views/ToolbarDynamicSpaceView', 'views/ToolbarSearchView'
],
function (ToolbarButtonView, ToolbarDynamicSpaceView, ToolbarSearchView) {

	var ToolbarItemsFactory = {
		create: function(name, itemModel) {
			if (name == 'dynamicSpace') {
				return new ToolbarDynamicSpaceView({ model: itemModel });
			} else if (name == 'search') {
				return new ToolbarSearchView({ model: itemModel });
			} else {
				return new ToolbarButtonView({ model: itemModel });
			}
		}
	};


	return ToolbarItemsFactory;
});