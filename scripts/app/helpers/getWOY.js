/**
 * Get week of year
 * @module App
 * @submodule helpers/getWOY
 * @param date {string|Date} Get the week based on this date
 */
define([], function() {
	var getWOY = function(pdate) {
		pdate = new Date(pdate);
		pdate.setHours(0, 0, 0);
		pdate.setDate(pdate.getDate() + 4 - (pdate.getDay() || 7));
		var onejan = new Date(pdate.getFullYear(), 0, 1);
		return Math.ceil((((pdate - onejan) / 86400000) + onejan.getDay() + 1) / 7);
	};
	return getWOY;
});