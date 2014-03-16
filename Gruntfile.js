module.exports = function(grunt) {

	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),


		jshint: {
			options: {
				curly:    false, // true: force { }
				eqnull:   true,  // true: enable something == null
				eqeqeq:   false, // true: force ===
				immed:    true,  // true: immidiatly invocated fns has to be in ()
				newcap:   true,  // true: construcotr has to have firt letter uppercased
				noarg:    true,  // true: no arguments.caller and arguments.callee
				sub:      true,  // true: no warning about a['something'] if a.something can be used
				undef:    true,  // true: can't use undeclared vars
				browser:  true,  // true: set window object and other stuff as globals
				devel:    true,  // true: set alert,confirm,console,... as globals
				boss:     true,  // true: allow assigments in conditions and return statements
				forin:    true,  // true: hasOwnProperty has to be in all for..in cycles
				noempty:  true,  // true: no empty blocks
				unused:   true,  // true: warn about unused vars
				trailing: true,  // true: no trailing whitespaces
				supernew: true,  // true: enable 'new Constructor' instead of 'new Constructor()' 
				onevar:   false, // true: only one var per fn
				funcscope: false,   // false: no 'var' in blocks
				maxdepth: 5,        // max nesting depth
				quotmark: 'single', // single: force '
				'-W041': true,      // don't warn about something == false/true
				'-W117': true,      // don't warn about not defined vars until I refactorize bg.js
				globals: {
					app: true,
					bg: true,
					tabID: true,
					chrome: false,
					define: false,
					require: false,

					/* browser globals not recognized by browser or devel options */
					requestAnimationFrame: true,
					URL: true,
					HTMLCollection: true
				}
			},
			all: ['scripts/app/**/*.js', 'scripts/bgprocess/**/*.js']
		},

		requirejs: {
			app: {
				options: {
					name: '../main',
					baseUrl: 'scripts/app',
					generateSourceMaps: true,
					preserveLicenseComments: false,
					optimize: 'uglify2',
					waitSeconds: 0,
					paths: {
						jquery: '../libs/jquery.min',
						underscore: '../libs/underscore.min',
						backbone: '../libs/backbone.min',
						text: '../text',
						i18n: '../i18n',
						domReady: '../domReady'
					},
					shim: {
						jquery: {
							exports: '$'
						},
						backbone: {
							deps: ['underscore', 'jquery'],
							exports: 'Backbone'
						},
						underscore: {
							exports: '_'
						}
					},
					excludeShallow: ['modules/Locale', 'jquery', 'underscore', 'backbone'],
					out: 'scripts/main-compiled.js'
				}
			},
			bg: {
				options: {
					name: '../bgprocess',
					baseUrl: 'scripts/bgprocess',
					generateSourceMaps: true,
					preserveLicenseComments: false,
					optimize: 'uglify2',
					waitSeconds: 0,
					paths: {
						jquery: '../libs/jquery.min',
						underscore: '../libs/underscore.min',
						backbone: '../libs/backbone.min',
						text: '../text',
						i18n: '../i18n',
						md5: '../libs/md5',
						domReady: '../domReady',
						backboneDB: '../libs/backbone.indexDB'
					},
					shim: {
						jquery: {
							exports: '$'
						},
						backboneDB: {
							deps: ['backbone']
						},
						backbone: {
							deps: ['underscore', 'jquery'],
							exports: 'Backbone'
						},
						underscore: {
							exports: '_'
						},
						md5: {
							exports: 'CryptoJS'
						}
					},
					excludeShallow: ['jquery', 'underscore', 'backbone', 'backboneDB'],
					out: 'scripts/bgprocess-compiled.js'
				}
			}
		},

		stylus: {
			compile: {
				options: {
					compress: false,
					//imports: ['nib']
				},
				files: {
					//'styles/options-compiled.css': 'options.styl', // 1:1 compile
					'styles/main-compiled.css': [
						'styles/global.styl', 
						'styles/feeds.styl',
						'styles/articles.styl',
						'styles/content.styl'
					]
				}
			}
		},
		watch: {
			scripts: {
				files: ['styles/*.styl'],
				tasks: ['stylus'],
				options: {
					spawn: false,
					interrupt: true,
					events: ['all']
				},
			},
		},
		yuidoc: {
			compile: {
				name: '<%= pkg.name %>',
				description: '<%= pkg.description %>',
				version: '<%= pkg.version %>',
				url: '<%= pkg.homepage %>',
				options: {
					paths: ['scripts'],
					/*themedir: 'path/to/custom/theme/',*/
					outdir: 'docs/'
				}
			}
		}
	});


	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-requirejs');
	grunt.loadNpmTasks('grunt-contrib-stylus');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-yuidoc');

	// Default task(s).
	grunt.registerTask('default', ['jshint']);
	grunt.registerTask('rjs', ['requirejs:app', 'requirejs:bg']);
};