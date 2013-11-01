/**
 * Get unix time with added/substracted UTC hours
 * @module App
 * @submodule helpers/unixutc
 * @param date {string|Date} Get the week based on this date
 */
define([], function() {
	var _unixutcoff = (new Date).getTimezoneOffset() * 60000;
	var unixutc = function(date) {
		return date.getTime() - _unixutcoff;
	};
	return unixutc;
});