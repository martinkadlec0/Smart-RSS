/**
 * @module App
 * @submodule models/Group
 */
define(['backbone', 'helpers/dateUtils', 'modules/Locale'], function (BB, dateUtils, Locale) {

    /**
     * Date group model
     * @class Group
     * @constructor
     * @extends Backbone.Model
     */
    let Group = BB.Model.extend({
        defaults: {
            /**
             * Title of the date group (Today, Yesterday, 2012, ...)
             * @attribute title
             * @type String
             * @default '<no title>'
             */
            title: '<no title>',

            /**
             * End date of date group (yesterdays date is midnight between yesterday and today) in unix time
             * @attribute date
             * @type Integer
             * @default 0
             */
            date: 0
        },
        idAttribute: 'date'
    });

    /**
     * Gets date group attributes of given date
     * @method getGroup
     * @static
     * @param date {Integer|Date}
     * @return {Object} Object contaning title & date attributes
     */
    Group.getGroup = (function () {
        const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
        const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
        let currentDate = null;
        let todayMidnight = null;
        let currentDaysSinceEpoch = null;
        let currentWeekOfYear = null;


        return function (date) {
            const itemDate = new Date(date);
            currentDate = currentDate || new Date();
            const itemDaysSinceEpoch = dateUtils.getDaysSinceEpoch(itemDate);
            currentDaysSinceEpoch = currentDaysSinceEpoch || dateUtils.getDaysSinceEpoch(currentDate);

            if (!todayMidnight) {
                todayMidnight = dateUtils.startOfDay(currentDate);
                setTimeout(function () {
                    todayMidnight = null;
                    currentDate = null;
                    currentDaysSinceEpoch = null;
                    currentWeekOfYear = null;
                }, 10000);
            }

            const itemMidnight = dateUtils.startOfDay(itemDate);

            let itemDateWeekOfYear = dateUtils.getWeekOfYear(itemDate);
            currentWeekOfYear = currentWeekOfYear || dateUtils.getWeekOfYear(currentDate);

            const difference = itemDaysSinceEpoch - currentDaysSinceEpoch;

            if (difference >= 0) {
                return {
                    title: Locale.TODAY.toUpperCase(),
                    date: dateUtils.addDays(todayMidnight, 5000) // 5000 = make sure "today" is the first element in list
                };
            }
            if (difference === -1) {
                return {
                    title: Locale.YESTERDAY.toUpperCase(),
                    date: todayMidnight
                };
            }
            if (itemDateWeekOfYear === (currentWeekOfYear) && difference >= -7) {
                return {
                    title: Locale[days[itemDate.getDay()]].toUpperCase(),
                    date: dateUtils.addDays(itemMidnight, 1)
                };
            }
            if (itemDateWeekOfYear + 1 === currentWeekOfYear && difference >= -14) {
                return {
                    title: Locale.LAST_WEEK.toUpperCase(),
                    date: dateUtils.startOfWeek(currentDate)
                };
            }
            if (itemDate.getMonth() === currentDate.getMonth() && itemDate.getFullYear() === currentDate.getFullYear()) {
                return {
                    title: Locale.EARLIER_THIS_MONTH.toUpperCase(),
                    date: dateUtils.startOfMonth(currentDate)
                };
            }
            if (itemDate.getFullYear() === currentDate.getFullYear()) {
                return {
                    title: Locale[months[itemDate.getMonth()]].toUpperCase(),
                    date: (new Date(itemDate.getFullYear(), itemDate.getMonth() + 1, 1, 0, 0, 0, 0))
                };
            }
            return {
                title: itemDate.getFullYear(),
                date: (new Date(itemDate.getFullYear() + 1, 0, 1, 0, 0, 0, 0))
            };
        };
    })();

    return Group;
});
