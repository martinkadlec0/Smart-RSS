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
    Array.prototype.last = function (value) {
        if (!this.length) {
            return null;
        }
        if (value) {
            this[this.length - 1] = value;
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
    Array.prototype.first = function (value) {
        if (!this.length) {
            return null;
        }
        if (value) {
            this[0] = value;
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
     * Escapes regexp characters in string
     * @method escape
     * @extends RegExp
     * @static
     * @param text {String} String to be escaped
     * @return {String} Escaped string
     */
    RegExp.escape = function (text) {
        return String(text).replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
    };
});