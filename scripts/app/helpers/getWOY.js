/**
 * Get week of year
 * @module App
 * @submodule helpers/getWOY
 * @param date {string|Date} Get the week based on this date
 */
define([], function () {
    return function (date) {
        date = new Date(date);
        date.setHours(0, 0, 0);
        date.setDate(date.getDate() + 4 - (date.getDay() || 7));
        const firstJanuary = new Date(date.getFullYear(), 0, 1);
        return Math.ceil((((date - firstJanuary) / 86400000) + firstJanuary.getDay() + 1) / 7);
    };
});