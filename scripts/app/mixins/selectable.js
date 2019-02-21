define(['jquery'], function ($) {

    return {
        selectedItems: [],
        selectPivot: null,
        selectFlag: false,
        restartSelection: function () {
            if (this.selectedItems.length) {
                this.selectedItems = [];
                this.$el
                    .find('.selected')
                    .removeClass('selected');
                this.$el
                    .find('.last-selected')
                    .removeClass('last-selected');
            }
            this.selectFirst();
        },
        selectFirst: function () {
            var first = $('.' + this.itemClass + ':not(.invisible)').get(0);
            if (first) this.select(first.view);
        },
        selectNext: function (e) {
            e = e || {};

            const selector = e.selectUnread ? '.unread:not(.invisible)' : '.' + this.itemClass + ':not(.invisible)';
            let next;
            if (e.selectUnread && this.selectPivot) {
                next = this.selectPivot.el.nextElementSibling;
            } else {
                next = this.$el.find('.last-selected');
                if (next.length) {
                    next = next.get(0).nextElementSibling;
                } else {
                    next = this.el.firstElementChild;
                }
            }
            while (next && !next.matchesSelector(selector)) {
                next = next.nextElementSibling;
            }

            if (!next && !e.shiftKey && !e.ctrlKey && bg.settings.get('circularNavigation')) {
                next = this.el.querySelector(selector);
                if (e.currentIsRemoved && next && this.$el.find('.last-selected').get(0) === next) {
                    next = [];
                }
            }
            if (next && next.view) {
                this.select(next.view, e, true);
                if (!this.inView(next)) {
                    next.scrollIntoView(false);
                }
            } else if (e.currentIsRemoved) {
                app.trigger('no-items:' + this.el.id);
            }

        },
        selectPrev: function (e) {
            e = e || {};
            const selector = e.selectUnread ? '.unread:not(.invisible)' : '.' + this.itemClass + ':not(.invisible)';
            let prev;
            if (e.selectUnread && this.selectPivot) {
                prev = this.selectPivot.el.previousElementSibling;
            } else {
                prev = this.$el.find('.last-selected');
                if (prev.length) {
                    prev = prev.get(0).previousElementSibling;
                } else {
                    prev = this.el.lastElementChild;
                }
            }
            while (prev && !prev.matchesSelector(selector)) {
                prev = prev.previousElementSibling;
            }

            if (!prev && !e.shiftKey && !e.ctrlKey && bg.settings.get('circularNavigation')) {
                prev = this.$el.find(selector + ':last').get(0);
                if (e.currentIsRemoved && prev && this.$el.find('.last-selected').get(0) === prev) {
                    prev = [];
                }
            }
            if (prev && prev.view) {
                this.select(prev.view, e, true);
                if (!this.inView(prev)) {
                    prev.scrollIntoView(true);
                }
            } else if (e.currentIsRemoved) {
                app.trigger('no-items:' + this.el.id);
            }
        },
        select: function (view, e, forceSelect) {
            e = e || {};
            let that = this;
            if ((e.shiftKey !== true && e.ctrlKey !== true) || (e.shiftKey && !this.selectPivot)) {
                this.selectedItems = [];
                this.selectPivot = view;
                this.$el.find('.selected').removeClass('selected');


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
                this.$el.find('.selected').removeClass('selected');
                this.selectedItems = [this.selectPivot];
                this.selectedItems[0].$el.addClass('selected');

                if (this.selectedItems[0] !== view) {
                    if (this.selectedItems[0].$el.index() < view.$el.index()) {
                        this.selectedItems[0].$el
                            .nextUntil(view.$el)
                            .not('.invisible,.date-group')
                            .each(function (i, el) {
                                $(el).addClass('selected');
                                that.selectedItems.push(el.view);
                            });
                    } else {
                        view.$el
                            .nextUntil(this.selectedItems[0].$el)
                            .not('.invisible,.date-group')
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
            e.preventDefault();
            const item = e.currentTarget.view;
            if (this.selectedItems.length > 1 && item.$el.hasClass('selected') && !e.ctrlKey && !e.shiftKey) {
                this.selectFlag = true;
                return false;
            }
            this.select(item, e);
            return false;
        },
        handleSelectableMouseUp: function (e) {
            // const item = e.currentTarget.view;
            // if (e.which === 1 && this.selectedItems.length > 1 && this.selectFlag) {
            //     this.select(item, e);
            //     this.selectFlag = false;
            // }
        }
    };
});