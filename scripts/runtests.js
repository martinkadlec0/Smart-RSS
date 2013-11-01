//<link rel="stylesheet" href="node_modules/mocha/mocha.css" />
define(['mocha', 'text!mochacss'], function(mocha, mochacss) {
	mocha.setup('bdd');
	app.content.log.$el.append('<style scoped>' + mochacss + '</style>');
	app.content.log.show();
	console.log('testrunner> mocha started');
	require([
		'../tests/preps',
		'../tests/counters'
	], function() {
		console.log('testrunner> tests described');
		mocha.run();
		console.log('testrunner> mocha finished');
	});
});