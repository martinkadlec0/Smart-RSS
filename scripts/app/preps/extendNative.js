/**
 * Extends prototypes of native objects with various methods.
 * Removes prefixes for some nonstandard fucntions.
 * @module App
 * @submodule preps/extendNative
 */
define([], function () {

    /**
     * Set or get last array item
     * @method last
     * @extends Array
     * @param value {Any} Value to set - optional
     * @return {Any} Last item of array, null if array is empty
     */
    Array.prototype.last = function (val) {
        if (!this.length) {
            return null;
        }
        if (val) {
            this[this.length - 1] = val;
        }
        return this[this.length - 1];
    };

    /**
     * Set or get first array item
     * @method last
     * @extends Array
     * @param value {Any} Value to set - optional
     * @return {Any} First item of array, null if array is empty
     */
    Array.prototype.first = function (val) {
        if (!this.length) {
            return null;
        }
        if (val) {
            this[0] = val;
        }
        return this[0];
    };

    /**
     * Get index of element in HTMLCollection (used by eg. Element#children)
     * @method indexOf
     * @extends HTMLCollection
     * @param element {HTMLElement} Element fo find index of
     * @return {Any} First item of array, null if array is empty
     */
    HTMLCollection.prototype.indexOf = Array.prototype.indexOf;

    /**
     * Git first next sibling that matches given selector
     * @method findNext
     * @extends Element
     * @param query {String} CSS selector
     * @return {HTMLELement|null} Found element
     */
    Element.prototype.findNext = function (query) {
        let cur = this;
        while (cur = cur.nextElementSibling) {
            if (cur.matchesSelector(query)) {
                return cur;
            }
        }
        return null;
    };

    /**
     * Git first previous sibling that matches given selector
     * @method findPrev
     * @extends Element
     * @param query {String} CSS selector
     * @return {HTMLELement|null} Found element
     */
    Element.prototype.findPrev = function (query) {
        let cur = this;
        while (cur = cur.previousElementSibling) {
            if (cur.matchesSelector(query)) {
                return cur;
            }
        }
        return null;
    };

    /**
     * Escapes regexp characters in string
     * @method escape
     * @extends RegExp
     * @static
     * @param text {String} String to be escaped
     * @return {String} Escaped string
     */
    RegExp.escape = function (str) {
        return String(str).replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
    };
});