define(['backbone'], function (BB) {
    return BB.View.extend({
        tagName: 'div',
        className: 'button',
        initialize: function () {
            const updateButtonState = () => {
                this.el.classList.remove('active');
                if (action.get('state')) {
                    if (bg.getBoolean(action.get('state'))) {
                        console.log(action.get('state'), bg.getBoolean(action.get('state')));
                        this.el.classList.add('active');
                    }
                }
            };

            const action = app.actions.get(this.model.get('actionName'));
            this.el.style.background = 'url("/images/' + action.get('icon') + '") no-repeat center center';


            this.el.dataset.action = this.model.get('actionName');
            this.el.title = action.get('title');
            updateButtonState();
            this.el.view = this;

            bg.settings.on('change', updateButtonState);
        }
    });
});
