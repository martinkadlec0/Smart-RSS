define(function () {
    const millisecondsInDay = 86400000;
    const unixUtcOffset = (new Date).getTimezoneOffset() * 60000;
    const zeroPad = function (num) {
        if (num < 10) {
            num = '0' + num;
        }
        return num;
    };
    const toTwelveHoursFormat = function (hours) {
        return hours % 12;
    };

    // All methods accept correct values for single argument variant of Date constructor
    // that is: Date object, JS timestamp (number of milliseconds since epoch) or date string
    // usage of the last option is discouraged due to inconsistent handling in different browsers
    return {
        unixutc: function (date) {
            const _date = new Date(date);
            return _date.getTime() - unixUtcOffset;
        },
        getWeekOfYear: function (date) {
            const _date = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
            const dayNum = _date.getUTCDay() || 7;
            _date.setUTCDate(_date.getUTCDate() + 4 - dayNum);
            const yearStart = new Date(Date.UTC(_date.getUTCFullYear(),0,1));
            return Math.ceil((((_date - yearStart) / millisecondsInDay) + 1)/7);
        },
        getDayOfYear: function (date) {
            const _date = new Date(date);
            _date.setHours(0, 0, 0);
            const start = new Date(_date.getFullYear(), 0, 0);
            const diff = (_date - start) + ((start.getTimezoneOffset() - _date.getTimezoneOffset()) * 60 * 1000);
            const oneDay = 1000 * 60 * 60 * 24;
            return Math.floor(diff / oneDay);
        },
        getDaysSinceEpoch: function (date) {
            const _date = new Date(date);
            return Math.floor(this.unixutc(_date) / millisecondsInDay);
        },
        startOfWeek: function (date, firstDayOfWeekIndex = 1) {
            const dayOfWeek = date.getDay();
            const _date = new Date(date);
            const diff = dayOfWeek >= firstDayOfWeekIndex ? dayOfWeek - firstDayOfWeekIndex : 6 - dayOfWeek;

            _date.setDate(date.getDate() - diff);
            return new Date(this.startOfDay(_date));
        },
        startOfDay: function (date) {
            return new Date(date).setHours(0, 0, 0, 0);
        },
        startOfMonth: function (date) {
            return new Date(this.startOfDay(date)).setDate(1);
        },
        addDays: function (date, days = 1) {
            const _date = new Date(date);
            _date.setDate(_date.getDate() + days);
            return _date;
        },
        formatDate: function (date, template) {
            const _date = new Date(date);
            const dateVal = (all, found) => {
                switch (found) {
                    case 'DD':
                        return zeroPad(_date.getDate());
                    case 'D':
                        return _date.getDate();
                    case 'MM':
                        return zeroPad(_date.getMonth() + 1);
                    case 'M':
                        return _date.getMonth() + 1;
                    case 'YYYY':
                        return _date.getFullYear();
                    case 'YY':
                        return _date.getFullYear().toString().substr(2, 2);
                    case 'hh':
                        return zeroPad(_date.getHours());
                    case 'h':
                        return _date.getHours();
                    case 'HH':
                        return zeroPad(toTwelveHoursFormat(_date.getHours()));
                    case 'H':
                        return toTwelveHoursFormat(_date.getHours());
                    case 'mm':
                        return zeroPad(_date.getMinutes());
                    case 'm':
                        return _date.getMinutes();
                    case 'ss':
                        return zeroPad(_date.getSeconds());
                    case 's':
                        return _date.getSeconds();
                    case 'u':
                        return _date.getMilliseconds();
                    case 'U':
                        return _date.getTime();
                    case 'T':
                        return _date.getTime() - _date.getTimezoneOffset() * 60000;
                    case 'W':
                        return _date.getDay();
                    case 'y':
                        return this.getDayOfYear(_date);
                    case 'w':
                        return this.getWeekOfYear(_date);
                    case 'G':
                        return _date.getTimezoneOffset();
                    case 'a':
                        return _date.getHours() > 12 ? 'PM' : 'AM';
                    default:
                        return '';
                }
            };
            return template.replace(/(DD|D|MM|M|YYYY|YY|hh|h|HH|H|mm|m|ss|s|u|U|W|y|w|G|a|T)/g, dateVal);
        }
    };
});
