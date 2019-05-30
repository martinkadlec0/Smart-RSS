/**
 * Factory for making instances of toolbar items
 * @module App
 * @submodule factories/ToolbarItemsFactory
 */
define([
        'views/ToolbarButtonView', 'views/ToolbarDynamicSpaceView', 'views/ToolbarSearchView'
    ],
    function (ToolbarButtonView, ToolbarDynamicSpaceView, ToolbarSearchView) {

        return {
            /**
             * Returns instance of toolbar item
             * @method create
             * @param name {string}
             * @param itemModel {Object}
             * @returns ToolbarDynamicSpaceView|ToolbarSearchView|ToolbarButtonView
             */
            create: function (name, itemModel) {
                if (name === 'dynamicSpace') {
                    return new ToolbarDynamicSpaceView({model: itemModel});
                } else if (name === 'search') {
                    return new ToolbarSearchView({model: itemModel});
                } else {
                    return new ToolbarButtonView({model: itemModel});
                }
            }
        };
    });