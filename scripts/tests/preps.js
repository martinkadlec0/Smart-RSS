define(['chai', 'preps/extendNative'], function(chai) {
	var expect = chai.expect;

	describe('preps', function() {

		/**
		 * Testing Array.prototype.first
		 */
		describe('Array#first', function() {

			it('should get first item', function() {
				var arr = [3, 5, 8];
				expect(arr.first()).to.equal(3);
			});

			it('should set first item', function() {
				var arr = [3, 5, 8];
				arr.first(33);
				expect(arr[0]).to.equal(33);
			});

			it('should return set value', function() {
				var arr = [3, 5, 8];
				expect(arr.first(33)).to.equal(33);
			});

			it('should return null', function() {
				var arr = [];
				expect(arr.first()).to.equal(null);
			});

		});

		/**
		 * Testing Array.prototype.last
		 */
		describe('Array#last', function() {
			
			it('should get last item', function() {
				var arr = [3, 5, 8];
				expect(arr.last()).to.equal(8);
			});

			it('should set last item', function() {
				var arr = [3, 5, 8];
				arr.last(88);
				expect(arr[arr.length - 1]).to.equal(88);
			});

			it('should return set value', function() {
				var arr = [3, 5, 8];
				expect(arr.last(88)).to.equal(88);
			});

			it('should return null', function() {
				var arr = [];
				expect(arr.last()).to.equal(null);
			});

		});

		/**
		 * Testing HTMLCollection.prototype.indexOf
		 */
		describe('HTMLCollection#indexOf', function() {

			it('shoud get index', function() {
				var tmp = document.createElement('div');
				tmp.innerHTML = '<div id="d1"></div><div id="d2"></div><div id="d3"></div>';
				second = tmp.querySelector('#d2');
				expect(tmp.children.indexOf(second)).to.equal(1);
			});

		});

		/**
		 * Testing Element.prototype.findNext
		 */
		describe('Element#findNext', function() {

			it('shoud find correct element', function() {
				var tmp = document.createElement('div');
				tmp.innerHTML = '<div id="d1"></div><div id="d2"></div><div id="d3"></div>';
				first = tmp.querySelector('#d1');
				third = tmp.querySelector('#d3');
				expect(first.findNext('#d3')).to.equal(third);
			});

		});

		/**
		 * Testing Element.prototype.findPrev
		 */
		describe('Element#findPrev', function() {

			it('shoud find correct element', function() {
				var tmp = document.createElement('div');
				tmp.innerHTML = '<div id="d1"></div><div id="d2"></div><div id="d3"></div>';
				first = tmp.querySelector('#d1');
				third = tmp.querySelector('#d3');
				expect(third.findPrev('#d1')).to.equal(first);
			});

		});

		/**
		 * Testing RegExp.escape
		 */
		describe('RegExp.escape', function() {

			it('shoud escape string', function() {
				var escaped = RegExp.escape('-[]/{}()*+?.\\^$|');
				expect(escaped).to.equal('\\-\\[\\]\\/\\{\\}\\(\\)\\*\\+\\?\\.\\\\\\^\\$\\|');
			});

		});

	});

});