/**
 * Date parser
 */

var formatDate = function() {
	var that;
	var addZero = function(num) {
		if (num < 10) num = "0" + num;
		return num;
	};
	var na = function(n, z) {
		return n % z;
	};
	var getDOY = function() {
		var dt = new Date(that);
		dt.setHours(0, 0, 0);
		var onejan = new Date(dt.getFullYear(), 0, 1);
		return Math.ceil((dt - onejan) / 86400000);
	};
	var getWOY = function() {
		var dt = new Date(that);
		dt.setHours(0, 0, 0);
		dt.setDate(dt.getDate() + 4 - (dt.getDay() || 7));
		var onejan = new Date(dt.getFullYear(), 0, 1);
		return Math.ceil((((dt - onejan) / 86400000) + onejan.getDay() + 1) / 7);
	};
	var dateVal = function(all, found) {
		switch (found) {
			case "DD":
				return addZero(that.getDate());
			case "D":
				return that.getDate();
			case "MM":
				return addZero(that.getMonth() + 1);
			case "M":
				return that.getMonth() + 1;
			case "YYYY":
				return that.getFullYear();
			case "YY":
				return that.getFullYear().toString().substr(2, 2);
			case "hh":
				return addZero(that.getHours());
			case "h":
				return that.getHours();
			case "HH":
				return addZero(na(that.getHours(), 12));
			case "H":
				return na(that.getHours(), 12);
			case "mm":
				return addZero(that.getMinutes());
			case "m":
				return that.getMinutes();
			case "ss":
				return addZero(that.getSeconds());
			case "s":
				return that.getSeconds();
			case "u":
				return that.getMilliseconds();
			case "U":
				return that.getTime();
			case "T":
				return that.getTime() - that.getTimezoneOffset() * 60000;
			case "W":
				return that.getDay();
			case "y":
				return getDOY();
			case "w":
				return getWOY();
			case "G":
				return that.getTimezoneOffset();
			case "a":
				return that.getHours() > 12 ? "pm" : "am";
			default:
				return "";
		}
	};
	return function(date, str) {
		if (!(date instanceof Date)) date = new Date(date);
		that = date;
		str = str.replace(/(DD|D|MM|M|YYYY|YY|hh|h|HH|H|mm|m|ss|s|u|U|W|y|w|G|a|T)/g, dateVal);
		return str;
	};
}();

var _unixutcoff = (new Date).getTimezoneOffset() * 60000;
function unixutc(date) {
	return date.getTime() - _unixutcoff;
}

function getWOY(dt) {
	dt.setHours(0, 0, 0);
	dt.setDate(dt.getDate() + 4 - (dt.getDay() || 7));
	var onejan = new Date(dt.getFullYear(), 0, 1);
	return Math.ceil((((dt - onejan) / 86400000) + onejan.getDay() + 1) / 7);
}