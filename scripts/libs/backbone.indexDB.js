/**
 * My own Backbone indexDB Adapter based on localStorage adapter from jeromegn:
 *
 * Version 1.1.6
 * https://github.com/jeromegn/Backbone.localStorage
 */
(function(root, factory) {
	if (typeof exports === 'object' && root.require) {
		module.exports = factory(require('backbone'));
	} else if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['backbone'], function(Backbone) {
			// Use global variables if the locals are undefined.
			return factory( Backbone || root.Backbone);
		});
	} else {
		// RequireJS isn't being used. Assume underscore and backbone are loaded in <script> tags
		factory(Backbone);
	}
}(this, function(Backbone) {
	// A simple module to replace `Backbone.sync` with *localStorage*-based
	// persistence. Models are given GUIDS, and saved into a JSON object. Simple
	// as that.

	// Get rid off browser prefixes
	window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
	window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
	window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;


	// Hold reference to Underscore.js and Backbone.js in the closure in order
	// to make things work even if they are removed from the global namespace

	// Generate four random hex digits.
	function S4() {
		return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
	}

	// Generate a pseudo-GUID by concatenating random hexadecimal.

	function guid() {
		return (S4() + S4() + '-' + S4() + '-' + S4() + '-' + S4() + '-' + S4() + S4() + S4());
	}

	// Our Store is represented by a single JS object in *localStorage*. Create it
	// with a meaningful name, like the name you'd give a table.
	// window.Store is deprectated, use Backbone.LocalStorage instead
	Backbone.LocalStorage = function(name) {
		if (!window.indexedDB) {
			throw 'Backbone.indexedDB: Environment does not support IndexedDB.';
		}
		this.name = name;
		this.db = null;
		var request = window.indexedDB.open('backbone-indexeddb', Backbone.LocalStorage.version);
		this.dbRequest = request;
		var that = this;

		request.addEventListener('error', function(e) {
			// user probably disallowed idb
			throw 'Error code: ' + this.errorCode;
			// what are the possible codes???
		});

		request.addEventListener('success', function(e) {
			that.db = this.result;
		});

		request.addEventListener('upgradeneeded', function(e) {
			var db = this.result;
			Backbone.LocalStorage.prepare(db);
		});

		//var store = this.localStorage().getItem(this.name);
		//this.records = (store && store.split(',')) || [];
	};

	Backbone.LocalStorage.prototype = Object.assign(Backbone.LocalStorage.prototype, {


		// Add a model, giving it a (hopefully)-unique GUID, if it doesn't already
		// have an id of it's own.
		create: function(model, cb) {
			if (!model.id) {
				model.id = guid();
				model.set(model.idAttribute, model.id);
			}
			this.localStorage().add(model.toJSON());
			//this.find(model, cb);
		},

		// Update a model by replacing its copy in `this.data`.
		update: function(model, cb) {
			var req = this.localStorage().put(model.toJSON());
			//this.find(model, cb);
		},

		// Retrieve a model from `this.data` by id.
		find: function(model, cb) {
			var request = this.localStorage().get(model.id);
			request.onsuccess = function() {
				cb(this.result);
			};
			request.onerror = function() {
				throw 'IndexDB Error: Can\'t read from or write to database';
			}
		},

		// Return the array of all models currently in storage.
		findAll: function(cb) {
			var items = [];

			this.localStorage('readonly').openCursor().onsuccess = function(event) {
				var cursor = this.result;
				if (cursor) {
					items.push(cursor.value);
					cursor.continue();
				} else {
					cb(items);
				}
			};
		},

		// Delete a model from `this.data`, returning it.
		destroy: function(model, cb) {
			if (model.isNew())
				return false;
			this.localStorage().delete(model.id);
			//cb(model);
			return model;
		},

		localStorage: (function() {
			var tx;

			window.addEventListener('message', function(e) {
				if (e.data.action === 'clear-tx') {
					tx = null;
				}
			});

			return function(type) {
				if (tx && !type) {
					try {
						var tmpStore = tx.objectStore(this.name);
						// neccesery to trigger error with <1ms async calls
						tmpStore.get(-1);
						return tmpStore;
					} catch(e) {}
				}

				var names = [].map.call(this.db.objectStoreNames, function(item) { return item });
				var tmpTx = this.db.transaction(names, type || 'readwrite');

				var tmpStore = tmpTx.objectStore(this.name);
				if (!type) {
					tx = tmpTx;
					// setImmidiate polyfill , doesn't work very wll tho.
					window.postMessage({ action: 'clear-tx' }, '*');
				}

				return tmpStore;
			}
		})(),

		_clear: function(cb) {
			var req = this.localStorage().clear();
			req.onsuccess = cb;
			req.onerror = cb;
		},

		// Size of localStorage.
		_storageSize: function(cb) {
			this.localStorage().count().onsuccess = cb;
		}

	});

	// localSync delegate to the model or collection's
	// *localStorage* property, which should be an instance of `Store`.
	// window.Store.sync and Backbone.localSync is deprecated, use Backbone.LocalStorage.sync instead
	Backbone.LocalStorage.sync = Backbone.localSync = function(method, model, options) {
		var store = model.localStorage || model.collection.localStorage;
		options = options || {};

		var that = this;

		var errorMessage, syncDfd = options.syncDfd || (Backbone.$.Deferred && Backbone.$.Deferred()); //If $ is having Deferred - use it.
		options.syncDfd = syncDfd;

		if (!store.db) {
			store.dbRequest.addEventListener('success', function(e) {
				store.db = this.result;
				Backbone.LocalStorage.sync.call(that, method, model, options);
			});
		} else {

			var cbh = callbackHandler.bind(this, options);

			try {

				switch (method) {
					case 'read':
						model.id !== undefined ? store.find(model, cbh) : store.findAll(cbh);
						break;
					case 'create':
						store.create(model, nothing);
						cbh(model.toJSON());
						break;
					case 'update':
						store.update(model, nothing);
						cbh(model.toJSON());
						break;
					case 'delete':
						store.destroy(model, nothing);
						cbh(model.toJSON());
						break;
				}

			} catch (error) {
				if (error.code === 22) { // && store._storageSize() === 0, what is code 22?
					errorMessage = 'Private browsing is unsupported';
				} else {
					errorMessage = error.message;
				}
				console.log('IDB ERR: ' + errorMessage);
				cbh(null, errorMessage);
			}
		}
		return syncDfd && syncDfd.promise();
	};

	function nothing() {

	}

	function callbackHandler(options, resp, errorMessage) {

		var syncDfd = options.syncDfd;
		if (resp) {
			if (options && options.success) {
				if (Backbone.VERSION === '0.9.10') {
					options.success(model, resp, options);
				} else {
					options.success(resp);
				}
			}
			if (syncDfd) {
				syncDfd.resolve(resp);
			}

		} else {
			errorMessage = errorMessage ? errorMessage : 'Record Not Found';

			if (options && options.error) {
				if (Backbone.VERSION === '0.9.10') {
					options.error(model, errorMessage, options);
				} else {
					options.error(errorMessage);
				}
			}

			if (syncDfd) {
				syncDfd.reject(errorMessage);
			}
		}

		if (options && options.complete) {
			options.complete(resp);
		}

	}

	Backbone.ajaxSync = Backbone.sync;

	Backbone.getSyncMethod = function(model) {
		if (model.localStorage || (model.collection && model.collection.localStorage)) {
			return Backbone.localSync;
		}

		return Backbone.ajaxSync;
	};

	// Override 'Backbone.sync' to default to localSync,
	// the original 'Backbone.sync' is still available in 'Backbone.ajaxSync'
	Backbone.sync = function(method, model, options) {
		return Backbone.getSyncMethod(model).apply(this, [method, model, options]);
	};

	return Backbone.LocalStorage;
}));