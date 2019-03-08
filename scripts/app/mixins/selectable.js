define(['jquery'], function ($) {

    return {
        selectedItems: [],
        selectPivot: null,
        selectFlag: false,
        restartSelection: function () {
            if (this.selectedItems.length) {
                this.selectedItems = [];
                const selectedItems = this.el.querySelectorAll('.selected');
                Array.from(selectedItems).forEach((element) => {
                    element.classList.remove('selected');
                });
                this.el.querySelector('.last-selected').classList.remove('last-selected');
            }
            this.selectFirst();
        },
        selectFirst: function () {
            const first = document.querySelector('.' + this.itemClass);
            if (first) {
                this.select(first.view);
                first.focus();
            }
        },
        selectNext: function (e) {
            e = e || {};

            const selector = e.selectUnread ? '.unread' : '.' + this.itemClass;
            let nextElement;
            let currentElement;
            if (e.selectUnread && this.selectPivot) {
                nextElement = this.selectPivot.el.nextElementSibling;
            } else {
                currentElement = this.el.querySelector('.last-selected');
                nextElement = currentElement.nextElementSibling;
            }
            while (nextElement && !nextElement.matchesSelector(selector)) {
                nextElement = nextElement.nextElementSibling;
            }

            if (!nextElement && !e.shiftKey && !e.ctrlKey && bg.settings.get('circularNavigation')) {
                nextElement = this.el.querySelector(selector + ':first-child');
                if (e.currentIsRemoved && nextElement && this.el.querySelector('.last-selected') === nextElement) {
                    nextElement = null;
                }
            }
            if (nextElement && nextElement.view) {
                this.select(nextElement.view, e, true);
            } else if (e.currentIsRemoved) {
                app.trigger('no-items:' + this.el.id);
            }
            if (nextElement) {
                nextElement.focus();
            }
        },
        selectPrev: function (e) {
            e = e || {};

            const selector = e.selectUnread ? '.unread' : '.' + this.itemClass;
            let previousElement;
            let currentElement;
            if (e.selectUnread && this.selectPivot) {
                previousElement = this.selectPivot.el.previousElementSibling;
            } else {
                currentElement = this.el.querySelector('.last-selected');
                previousElement = currentElement.previousElementSibling;

            }
            while (previousElement && !previousElement.matchesSelector(selector)) {
                previousElement = previousElement.previousElementSibling;
            }

            if (!previousElement && !e.shiftKey && !e.ctrlKey && bg.settings.get('circularNavigation')) {
                previousElement = this.el.querySelector(selector + ':last-child');
                if (e.currentIsRemoved && previousElement && this.el.querySelector('.last-selected') === previousElement) {
                    previousElement = null;
                }
            }
            if (previousElement && previousElement.view) {
                this.select(previousElement.view, e, true);
            } else if (e.currentIsRemoved) {
                app.trigger('no-items:' + this.el.id);
            }
            if (previousElement) {
                previousElement.focus();
            }
        },
        select: function (view, e, forceSelect) {
            e = e || {};
            let that = this;
            if ((e.shiftKey !== true && e.ctrlKey !== true) || (e.shiftKey && !this.selectPivot)) {
                this.selectedItems = [];
                this.selectPivot = view;
                const selectedItems = this.el.querySelectorAll('.selected');
                Array.from(selectedItems).forEach((element) => {
                    element.classList.remove('selected');
                });

                if (!window || !window.frames) {
                    bg.logs.add({message: 'Event duplication bug! Clearing events now...'});
                    bg.console.log('Event duplication bug! Clearing events now...');
                    bg.sources.trigger('clear-events', -1);
                    return;
                }

                setTimeout(function () {
                    this.trigger('pick', view, e);
                }.bind(this), 0);

            } else if (e.shiftKey && this.selectPivot) {
                const selectedItems = this.el.querySelectorAll('.selected');
                Array.from(selectedItems).forEach((element) => {
                    element.classList.remove('selected');
                });
                this.selectedItems = [this.selectPivot];
                this.selectedItems[0].el.classList.add('selected');

                if (this.selectedItems[0] !== view) {
                    if (this.selectedItems[0].$el.index() < view.$el.index()) {
                        this.selectedItems[0].$el
                            .nextUntil(view.$el)
                            .not('.date-group')
                            .each(function (i, el) {
                                $(el).addClass('selected');
                                that.selectedItems.push(el.view);
                            });
                    } else {
                        view.$el
                            .nextUntil(this.selectedItems[0].$el)
                            .not('.date-group')
                            .each(function (i, el) {
                                $(el).addClass('selected');
                                that.selectedItems.push(el.view);
                            });
                    }

                }

                if (forceSelect === true) {
                    setTimeout(function () {
                        this.trigger('pick', view, e);
                    }.bind(this), 0);
                }

            } else if (e.ctrlKey && view.$el.hasClass('selected')) {
                view.$el.removeClass('selected');
                view.$el.removeClass('last-selected');
                this.selectPivot = null;
                this.selectedItems.splice(this.selectedItems.indexOf(view), 1);
                return;
            } else if (e.ctrlKey) {
                this.selectPivot = view;
            }

            this.$el.find('.last-selected').removeClass('last-selected');
            if (this.selectedItems[0] !== view) {
                this.selectedItems.push(view);
                view.$el.addClass('selected');
            }
            view.$el.addClass('last-selected');
        },
        inView: function (cel) {
            var $cel = $(cel);
            return !($cel.position().top - this.$el.offset().top < 0 || $cel.position().top + cel.offsetHeight >= this.el.offsetHeight);

        },
        handleSelectableMouseDown: function (e) {
            if (e.which === 2) {
                // return browser.tabs.create({url: e.currentTarget.view.model.attributes.url, active: false});
                return true;
            }
            const item = e.currentTarget.view;
            if (item.el.classList.contains('item')) {
                e.preventDefault();
            }
            if (this.selectedItems.length > 1 && item.$el.hasClass('selected') && !e.ctrlKey && !e.shiftKey) {
                this.selectFlag = true;
                return false;
            }
            this.select(item, e);
            return false;
        },
        handleSelectableMouseUp: function (e) {
            const item = e.currentTarget.view;
            if (e.which === 1 && this.selectedItems.length > 1 && this.selectFlag) {
                this.select(item, e);
                this.selectFlag = false;
            }
        }
    };
});