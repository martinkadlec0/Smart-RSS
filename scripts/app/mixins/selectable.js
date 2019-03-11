define([], function () {

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
                    const element = this.selectedItems[0].el;
                    const currentIndex = [...element.parentNode.children].indexOf(element);
                    const viewElement = view.el;
                    const viewIndex = [...viewElement.parentNode.children].indexOf(viewElement);
                    const siblings = [];
                    if (currentIndex < viewIndex) {

                        let sibling = element.nextElementSibling;
                        while (sibling) {
                            if (sibling.matches('.date-group')) {
                                continue;
                            }
                            if (sibling === viewElement) {
                                break;
                            }
                            siblings.push(sibling);
                            sibling = sibling.nextElementSibling;
                        }

                    } else {
                        let sibling = viewElement.nextElementSibling;
                        while (sibling) {
                            if (sibling.matches('.date-group')) {
                                continue;
                            }
                            if (sibling === element) {
                                break;
                            }
                            siblings.push(sibling);
                            sibling = sibling.nextElementSibling;
                        }
                    }
                    siblings.forEach((element) => {
                        element.classList.add('selected');
                        this.selectedItems.push(element.view);
                    });

                }

                if (forceSelect === true) {
                    setTimeout(function () {
                        this.trigger('pick', view, e);
                    }.bind(this), 0);
                }

            } else if (e.ctrlKey && view.el.classList.contains('selected')) {
                view.el.classList.remove('selected');
                view.el.classList.remove('last-selected');
                this.selectPivot = null;
                this.selectedItems.splice(this.selectedItems.indexOf(view), 1);
                return;
            } else if (e.ctrlKey) {
                this.selectPivot = view;
            }

            const lastSelected = this.el.querySelector('.last-selected');
            if (lastSelected) {
                lastSelected.classList.remove('last-selected');
            }
            if (this.selectedItems[0] !== view) {
                this.selectedItems.push(view);
                view.el.classList.add('selected');
            }
            view.el.classList.add('last-selected');
        },
        // inView: function (cel) {
        //     var $cel = $(cel);
        //     return !($cel.position().top - this.$el.offset().top < 0 || $cel.position().top + cel.offsetHeight >= this.el.offsetHeight);
        //
        // },
        handleSelectableMouseDown: function (e) {
            if (e.which === 2) {
                // return browser.tabs.create({url: e.currentTarget.view.model.attributes.url, active: false});
                return true;
            }
            const item = e.currentTarget.view;
            if (item.el.classList.contains('articles-list-item')) {
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