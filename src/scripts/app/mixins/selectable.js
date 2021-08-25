define(function () {

    return {
        selectedItems: [],
        selectPivot: null,
        selectFlag: false,
        selectSibling: function (e, relation) {
            e = e || {};

            const sibling = relation === 'previous' ? 'previousElementSibling' : 'nextElementSibling';

            const selector = (e.selectUnread ? '.unread' : '.' + this.itemClass) + ':not([hidden])';
            let siblingElement;
            let currentElement;
            if (e.selectUnread && this.selectPivot) {
                siblingElement = this.selectPivot.el[sibling];
            } else {
                currentElement = this.el.querySelector('.last-selected');
                currentElement && (siblingElement = currentElement[sibling]);
            }
            while (siblingElement && !siblingElement.matches(selector)) {
                siblingElement = siblingElement[sibling];
            }

            if (bg.settings.get('circularNavigation') && !e.ctrlKey && !e.shiftKey && !siblingElement) {
                siblingElement = this.el.querySelector(selector + ':nth-of-type(1)');
                if (e.currentIsRemoved && siblingElement && this.el.querySelector('.last-selected') === siblingElement) {
                    siblingElement = null;
                }
            }
            if (siblingElement && siblingElement.view) {
                this.select(siblingElement.view, e, true);
            } else if (e.currentIsRemoved) {
                app.trigger('no-items:' + this.el.id);
            }
            if (siblingElement) {
                siblingElement.focus();
            }
        },
        selectNextSelectable: function (e) {
            this.selectSibling(e, 'next');
        },
        selectPrev: function (e) {
            this.selectSibling(e, 'previous');
        },
        select: function (view, e = {}, forceSelect = false) {
            if ((e.shiftKey !== true && e.ctrlKey !== true) || (e.shiftKey && !this.selectPivot)) {
                this.selectedItems = [];
                this.selectPivot = view;
                const selectedItems = this.el.querySelectorAll('.selected');
                Array.from(selectedItems).forEach((element) => {
                    element.classList.remove('selected');
                });

                if (!window || !window.frames) {
                    bg.logs.add({message: 'Event duplication bug! Clearing events now...'});
                    bg.sources.trigger('clear-events', -1);
                    return;
                }

                setTimeout(() => {
                    this.trigger('pick', view, e);
                }, 0);

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
                            if (sibling.classList.contains('date-group')) {
                                sibling = sibling.nextElementSibling;
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
                            if (sibling.classList.contains('date-group')) {
                                sibling = sibling.nextElementSibling;
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
            if (!this.selectedItems[0] || this.selectedItems[0] !== view) {
                this.selectedItems.push(view);
                view.el.classList.add('selected');
            }
            view.el.classList.add('last-selected');
        },
        handleSelectableMouseDown: function (event) {
            if (event.which === 2) {
                return true;
            }
            event.preventDefault();
            const item = event.currentTarget.view;
            if (this.selectedItems.length > 1 && item.el.classList.contains('selected') && !event.ctrlKey && !event.shiftKey) {
                this.selectFlag = true;
                return false;
            }
            this.select(item, event);
            return false;
        },
        handleSelectableMouseUp: function (event) {
            const item = event.currentTarget.view;
            if (event.which === 1 && this.selectedItems.length > 1 && this.selectFlag) {
                this.select(item, event);
                this.selectFlag = false;
            }
        }
    };
});
