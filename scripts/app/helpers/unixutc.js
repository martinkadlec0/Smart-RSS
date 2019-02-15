/**
 * Get unix time with added/substracted UTC hours
 * @module App
 * @submodule helpers/unixutc
 * @param date {string|Date} Get the week based on this date
 */
define([], function() {
	const unixUtcOffset = (new Date).getTimezoneOffset() * 60000;
	return function(date) {
		return date.getTime() - unixUtcOffset;
	};
});