define(['backbone', 'jquery', 'modules/Locale', ], function (BB, $, Locale) {
    return BB.View.extend({
        tagName: 'input',
        className: 'input-search',
        initialize: function () {

            this.el.setAttribute('placeholder', Locale.SEARCH);
            this.el.setAttribute('type', 'search');
            this.el.setAttribute('tabindex', -1);
            this.el.required = true;



            const action = app.actions.get(this.model.get('actionName'));

            // const newEl = $('<input type="search" required class="input-search" />');
            // this.$el.replaceWith(newEl);
            // this.$el = newEl;
            //
            //
            // this.$el.attr('placeholder', Locale.SEARCH);
            // this.$el.attr('tabindex', -1);
            // this.el = this.$el.get(0);

            this.el.dataset.action = this.model.get('actionName');
            this.el.title = action.get('title');

            this.el.view = this;
        }
    });
});