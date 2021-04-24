/**
 * Returns formatted date string
 * @module App
 * @submodule helpers/formatDate
 * @param date {Number|Date} Date to be formatted
 * @param formatString {String} String consisting of special characters
 * @example formatDate(new Date, 'YYYY-MM-DD hh:mm');
 */
define(function () {
    return (function () {
        let that;
        const zeroPad = function (num) {
            if (num < 10) {
                num = '0' + num;
            }
            return num;
        };
        const na = function (n, z) {
            return n % z;
        };

        const getDOY = function () {
            const dt = new Date(that);
            const firstJanuary = new Date(dt.getFullYear(), 0, 1);
            dt.setHours(0, 0, 0);
            return Math.ceil((dt - firstJanuary) / 86400000);
        };
        const getWOY = function () {
            const dt = new Date(that);
            const firstJanuary = new Date(dt.getFullYear(), 0, 1);
            dt.setHours(0, 0, 0);
            dt.setDate(dt.getDate() + 4 - (dt.getDay() || 7));
            return Math.ceil((((dt - firstJanuary) / 86400000) + firstJanuary.getDay() + 1) / 7);
        };
        const dateVal = function (all, found) {
            switch (found) {
                case 'DD':
                    return zeroPad(that.getDate());
                case 'D':
                    return that.getDate();
                case 'MM':
                    return zeroPad(that.getMonth() + 1);
                case 'M':
                    return that.getMonth() + 1;
                case 'YYYY':
                    return that.getFullYear();
                case 'YY':
                    return that.getFullYear().toString().substr(2, 2);
                case 'hh':
                    return zeroPad(that.getHours());
                case 'h':
                    return that.getHours();
                case 'HH':
                    return zeroPad(na(that.getHours(), 12));
                case 'H':
                    return na(that.getHours(), 12);
                case 'mm':
                    return zeroPad(that.getMinutes());
                case 'm':
                    return that.getMinutes();
                case 'ss':
                    return zeroPad(that.getSeconds());
                case 's':
                    return that.getSeconds();
                case 'u':
                    return that.getMilliseconds();
                case 'U':
                    return that.getTime();
                case 'T':
                    return that.getTime() - that.getTimezoneOffset() * 60000;
                case 'W':
                    return that.getDay();
                case 'y':
                    return getDOY();
                case 'w':
                    return getWOY();
                case 'G':
                    return that.getTimezoneOffset();
                case 'a':
                    return that.getHours() > 12 ? 'PM' : 'AM';
                default:
                    return '';
            }
        };
        return function (date, str) {
            if (!(date instanceof Date)) {
                date = new Date(date);
            }
            that = date;
            str = str.replace(/(DD|D|MM|M|YYYY|YY|hh|h|HH|H|mm|m|ss|s|u|U|W|y|w|G|a|T)/g, dateVal);
            return str;
        };
    }());
});
