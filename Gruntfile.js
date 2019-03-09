module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        jshint: {
            options: {
                curly: false, // true: force { }
                eqnull: true,  // true: enable something == null
                eqeqeq: true, // true: force ===
                immed: true,  // true: immidiatly invocated fns has to be in ()
                newcap: true,  // true: construcotr has to have firt letter uppercased
                noarg: true,  // true: no arguments.caller and arguments.callee
                sub: true,  // true: no warning about a['something'] if a.something can be used
                undef: true,  // true: can't use undeclared vars
                browser: true,  // true: set window object and other stuff as globals
                devel: true,  // true: set alert,confirm,console,... as globals
                boss: true,  // true: allow assigments in conditions and return statements
                forin: true,  // true: hasOwnProperty has to be in all for..in cycles
                noempty: true,  // true: no empty blocks
                unused: true,  // true: warn about unused vars
                trailing: true,  // true: no trailing whitespaces
                supernew: true,  // true: enable 'new Constructor' instead of 'new Constructor()'
                onevar: false, // true: only one var per fn
                funcscope: false,   // false: no 'var' in blocks
                maxdepth: 5,        // max nesting depth
                quotmark: 'single', // single: force '
                // '-W041': true,      // don't warn about something == false/true
                '-W117': true,      // don't warn about not defined vars until I refactorize bg.js,
                esversion: 6,
                futurehostile: true,
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

        zip: {
            'skip-files': {
                router: function (filepath) {
                    var skipped = [
                        'node_modules',
                        'package.json',
                        'package-lock.json',
                        'package.zip'
                    ];
                    var path = require('path');
                    var name = path.basename(filepath);
                    if (skipped.includes(name)) {
                        return null;
                    }
                    if (filepath.includes('node_modules')) {
                        return null;
                    }

                    return filepath;
                },
                src: ['**/*'],
                dest: 'package.zip'
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-zip');

    grunt.registerTask('bump-version', '', function () {
        const manifest = grunt.file.readJSON('manifest.json');
        let version = manifest.version;

        let versionArr = version.split('.');
        versionArr[2] = parseInt(versionArr[2]) + 1;
        version = versionArr.join('.');

        manifest.version = version;
        grunt.file.write('manifest.json', JSON.stringify(manifest, null, 2));
        let {exec} = require('child_process');
        let done = this.async();
        exec('git add manifest.json', (err, stdout, stderr) => {
            if (err) {
                // node couldn't execute the command
                console.log(`stderr: ${stderr}`);
                done(false);
                return;
            }
            exec('git commit -m "auto version bump"', (err, stdout, stderr) => {
                console.log(`stdout: ${stdout}`);
                if (err) {
                    console.log(`stderr: ${stderr}`);
                    done(false);
                    return;
                }
                grunt.file.write('scripts/version.js', 'const version = \'' + version + '\';');
                done(true);
            });
        });
    });

    grunt.registerTask('restore-displayed-version', '', function(){
        grunt.file.write('scripts/version.js', 'const version = \'dev build\';');
    });

    // Default task(s).
    grunt.registerTask('default', ['jshint']);
    grunt.registerTask('package', ['zip']);
    grunt.registerTask('release', ['bump-version', 'zip', 'restore-displayed-version']);
};