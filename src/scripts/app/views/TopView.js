define([
    'backbone', 'modules/Locale', 'views/feedList'
], function (BB, Locale) {
    return BB.View.extend({
        tagName: 'div',
        className: 'sources-list-item',
        template: `<img src="/images/feedupdate.svg" class="source-icon loading"/>
<img src="/images/brokenFeed.png" class="source-icon broken"/>
<img src="<%= favicon %>" class="source-icon icon"/>

<div class="source-title"><%- title %></div>
<div class="source-counter"><%- count %></div>
`,
        handleMouseUp: function (e) {
            if (e.which === 3) {
                this.showContextMenu(e);
            }
        },
        getSelectData: function (e) {
            return {
                action: 'new-select',
                value: this.model.id || Object.assign({}, this.model.get('filter')),
                name: this.model.get('name'),
                unreadOnly: !!e.altKey
            };
        },
        setTitle: function (unread, total) {
            this.el.setAttribute('title',
                this.model.get('title') + ' (' + unread + ' ' + Locale.UNREAD + ', ' + total + ' ' + Locale.TOTAL + ')'
            );
        }
    });
});
