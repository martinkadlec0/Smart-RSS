define(['chai', 'preps/extendNative'], function(chai) {
	var expect = chai.expect;

	describe('Counters - Feed actions', function() {
		var source;
		var allUnread = bg.info.get('allCountUnread');
		var allTotal = bg.info.get('allCountTotal');
		
		this.timeout(10000);

		describe('Adding feed', function() {
		
			before(function(done) {
				source = bg.sources.create({
					url: 'http://smartrss.martinkadlec.eu/test1.rss'
				}, { wait: true });

				source.on('update', function() {
					done();
				});
			});

			it('should increase feed unread counter', function() {
				expect(source.get('count')).to.equal(3);
			});

			it('should increase feed total counter', function() {
				expect(source.get('countAll')).to.equal(3);
			});

			it('should increase all feeds unread counter', function() {
				expect(bg.info.get('allCountUnread')).to.equal(allUnread + 3);
			});

			it('should increase all feeds total counter', function() {
				expect(bg.info.get('allCountTotal')).to.equal(allTotal + 3);
			});

			

			
		});

		describe('Updating feed', function() {
			before(function(done) {
				source.save({ url: 'http://smartrss.martinkadlec.eu/test2.rss' });
				bg.loader.downloadOne(source);

				source.on('update', function() {
					done();
				});
			});

			it('should increase feed counter', function() {
				expect(source.get('count')).to.equal(4);
			});

			it('should increase feed total counter', function() {
				expect(source.get('countAll')).to.equal(4);
			});

			it('should increase all feeds unread counter', function() {
				expect(bg.info.get('allCountUnread')).to.equal(allUnread + 4);
			});

			it('should increase all feeds total counter', function() {
				expect(bg.info.get('allCountTotal')).to.equal(allTotal + 4);
			});
		});

		var folder1, folder2;
		describe('Moving feed from root to folder', function() {
			before(function(done) {
				folder1 = bg.folders.create({
					title: 'Test 1'
				}, { wait: true, success: function(f) {
					done();
					source.save({ folderID: f.id });
				} });
			});

			it('should increase folder unread counter', function() {
				expect(folder1.get('count')).to.equal(4);
			});

			it('should increase folder total counter', function() {
				expect(folder1.get('countAll')).to.equal(4);
			});

		});

		describe('Moving feed from folder to folder', function() {
			before(function(done) {
				folder2 = bg.folders.create({
					title: 'Test 2'
				}, { wait: true, success: function(f) {
					done();
					source.save({ folderID: f.id });
				} });
			});

			it('should increase to-folder unread counter', function() {
				expect(folder2.get('count')).to.equal(4);
			});

			it('should increase to-folder total counter', function() {
				expect(folder2.get('countAll')).to.equal(4);
			});

			it('should decrease from-folder unread counter', function() {
				expect(folder1.get('count')).to.equal(0);
			});

			it('should decrease from-folder total counter', function() {
				expect(folder1.get('countAll')).to.equal(0);
			});

			after(function(done) {
				folder1.destroy().then(function() { 
					done();
				});
			});

		});

		describe('Moving feed from folder to root', function() {

			before(function() {
				source.save({ folderID: null });
			});

			it('should decrease folder unread counter', function() {
				expect(folder2.get('count')).to.equal(0);
			});

			it('should decrease folder total counter', function() {
				expect(folder2.get('countAll')).to.equal(0);
			});

			after(function(done) {
				folder2.destroy().then(function() { 
					done();
				});
			});

		});

		describe('Destroying feed', function() {

			before(function(done) {
				source.destroy();
				setTimeout(done, 50);
			});

			it('should decrease all feeds unread counter', function() {
				expect(bg.info.get('allCountUnread')).to.equal(allUnread);
			});

			it('should decrease all feeds total counter', function() {
				expect(bg.info.get('allCountTotal')).to.equal(allTotal);
			});
		});
	});

	describe('Counters - Article actions', function() {
		var source;
		var sourceItems = [];
		var allUnread = bg.info.get('allCountUnread');
		var allTotal = bg.info.get('allCountTotal');
		
		this.timeout(5000);

		describe('Marking article as read', function() {
		
			before(function(done) {
				source = bg.sources.create({
					url: 'http://smartrss.martinkadlec.eu/test1.rss'
				}, { wait: true });

				source.on('update', function() {
					sourceItems = bg.items.where({ sourceID: source.id });
					sourceItems[0].save({
						unread: false,
						visited: true
					});
					done();
				});
			});

			it('should decrease feed unread counter', function() {
				expect(source.get('count')).to.equal(2);
			});

			it('should decrease all feeds unread counter', function() {
				expect(bg.info.get('allCountUnread')).to.equal(allUnread + 2);
			});
			
			after(function(done) {
				source.destroy();
				setTimeout(done, 50);
			});
			
		});

		describe('Moving article to trash', function() {
		
			before(function(done) {
				source = bg.sources.create({
					url: 'http://smartrss.martinkadlec.eu/test1.rss'
				}, { wait: true });

				source.on('update', function() {
					sourceItems = bg.items.where({ sourceID: source.id });
					sourceItems[0].save({
						trashed: true,
						visited: true
					});
					done();
				});
			});

			it('should decrease feed unread counter', function() {
				expect(source.get('count')).to.equal(2);
			});

			it('should decrease feed total counter', function() {
				expect(source.get('countAll')).to.equal(2);
			});

			it('should decrease all feeds unread counter', function() {
				expect(bg.info.get('allCountUnread')).to.equal(allUnread + 2);
			});

			it('should decrease all feeds total counter', function() {
				expect(bg.info.get('allCountTotal')).to.equal(allTotal + 2);
			});
			
			after(function(done) {
				source.destroy();
				setTimeout(done, 50);
			});
			
		});

		describe('Destroying article', function() {
		
			before(function(done) {
				source = bg.sources.create({
					url: 'http://smartrss.martinkadlec.eu/test1.rss'
				}, {wait: true });

				source.on('update', function() {
					sourceItems = bg.items.where({ sourceID: source.id });
					sourceItems[0].markAsDeleted();
					done();
				});
			});

			it('should decrease feed unread counter', function() {
				expect(source.get('count')).to.equal(2);
			});

			it('should decrease feed total counter', function() {
				expect(source.get('countAll')).to.equal(2);
			});

			it('should decrease all feeds unread counter', function() {
				expect(bg.info.get('allCountUnread')).to.equal(allUnread + 2);
			});

			it('should decrease all feeds total counter', function() {
				expect(bg.info.get('allCountTotal')).to.equal(allTotal + 2);
			});
			
			after(function(done) {
				source.destroy();
				setTimeout(done, 50);
			});
			
		});

	});
});