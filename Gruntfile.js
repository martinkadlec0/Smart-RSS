module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({
        jshint: {
            options: {
                curly: false, // true: force { }
                eqnull: true,  // true: enable something == null
                eqeqeq: true, // true: force ===
                immed: true,  // true: immediately invocated fns has to be in ()
                newcap: true,  // true: constructor has to have first letter uppercased
                noarg: true,  // true: no arguments.caller and arguments.callee
                sub: true,  // true: no warning about a['something'] if a.something can be used
                undef: true,  // true: can't use undeclared vars
                browser: true,  // true: set window object and other stuff as globals
                devel: true,  // true: set alert,confirm,console,... as globals
                boss: true,  // true: allow assignments in conditions and return statements
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

        package: {
            firefox: {
                skipped: [
                    'node_modules',
                    'package.json',
                    'package-lock.json',
                    'Gruntfile.js',
                    'rssDetector/manifest.json'
                ],
                removeFromManifest: [
                    'chromium_content_security_policy'
                ]
            },
            chromium: {
                skipped: [
                    'node_modules',
                    'package.json',
                    'package-lock.json',
                    'Gruntfile.js',
                    'rssDetector'
                ],
                removeFromManifest: [
                    'content_scripts',
                    'page_action',
                    'applications',
                    'developer'
                ],
                csp: 'chromium_content_security_policy'
            },
            detector: {
                alwaysPackage: false,
                skipped: [
                    'versions.json'
                ],
                root: 'rssDetector',
                versionsFile: 'versions.json'
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');


    grunt.registerMultiTask('package', '', function () {
        const defaultConfig = {
            skipped: [],
            removeFromManifest: [],
            alwaysPackage: true,
            root: null,
            versionsFile: null
        };

        const path = require('path');
        const fs = require('fs');


        const config = Object.assign(defaultConfig, this.data);

        const root = config.root ? __dirname + '/' + config.root : __dirname;
        const manifestPath = root + '/manifest.json';
        const originalManifest = grunt.file.readJSON(manifestPath);
        const version = originalManifest.version;

        let newManifest = Object.assign({}, originalManifest);

        if (config.csp) {
            newManifest['content_security_policy'] = newManifest[config.csp];
            delete newManifest[config.csp];
        }
        if (config.removeFromManifest.length > 0) {
            config.removeFromManifest.forEach((item) => {
                delete newManifest[item];
            });
        }
        grunt.file.write(manifestPath, JSON.stringify(newManifest, null, 2));


        const filesList = [];

        const scan = (dir) => {
            fs.readdirSync(dir).forEach((file) => {
                const filePath = dir + '/' + file;
                if (file[0] === '.') {
                    return;
                }

                let skip = false;
                if (config.skipped.length > 0) {
                    config.skipped.forEach((blacklisted) => {
                        if (filePath.includes(blacklisted)) {
                            skip = true;
                        }
                    });
                }
                if (skip) {
                    return;
                }
                if (path.extname(file) === '.zip') {
                    return;
                }
                if (fs.lstatSync(filePath).isDirectory()) {
                    scan(filePath);
                    return;
                }
                filesList.push(filePath);
            });
        };
        scan(root);


        if (config.versionsFile) {
            const versionsPath = root + '/' + config.versionsFile;
            const versions = fs.existsSync(versionsPath) ? grunt.file.readJSON(versionsPath) : {};
            const md5File = require('md5-file');
            let newVersions = {};
            let createPackage = false;
            filesList.forEach((item) => {
                const hash = md5File.sync(item);
                const fileName = item.split('\\').pop().split('/').pop();
                if (fileName === 'manifest.json') {
                    return;
                }
                newVersions[fileName] = hash;
                if (!versions[fileName] || versions[fileName] !== newVersions[fileName]) {
                    createPackage = true;
                    console.log('diff', fileName);
                }
            });

            if (createPackage) {
                grunt.file.write(versionsPath, JSON.stringify(newVersions, null, 2));
                grunt.task.run('bump-version:' + config.root + ':' + config.versionsFile);
            }

        }

        createPackage = typeof createPackage !== 'undefined' ? createPackage || config.alwaysPackage : config.alwaysPackage;


        if (createPackage) {
            const AdmZip = require('adm-zip');
            const zipFile = new AdmZip();
            filesList.forEach((file) => {
                let path = file.replace(root, '');
                path = path.substring(0, path.lastIndexOf('/'));
                path = path.substring(1, path.length);
                zipFile.addLocalFile(file, path);
            });
            zipFile.writeZip(this.target + '_' + version + '.zip');
        }

        if (config.removeFromManifest) {
            grunt.file.write(manifestPath, JSON.stringify(originalManifest, null, 2));
        }
    });


    grunt.registerTask('bump-version', '', function (root, versionsFile) {
        const manifestPath = typeof root !== 'undefined' ? root + '/manifest.json' : 'manifest.json';
        const manifest = grunt.file.readJSON(manifestPath);
        let version = manifest.version;

        let versionArr = version.split('.');
        versionArr[2] = parseInt(versionArr[2]) + 1;
        version = versionArr.join('.');

        manifest.version = version;
        grunt.file.write(manifestPath, JSON.stringify(manifest, null, 2));
        let {exec} = require('child_process');
        let done = this.async();
        let gitCommand = 'git add ' + manifestPath;
        if (typeof versionsFile !== 'undefined') {
            gitCommand += ' ' + root + '/' + versionsFile;
        }
        console.log(gitCommand);
        exec(gitCommand, (err, stdout, stderr) => {
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
                if (!root) {
                    grunt.file.write('scripts/version.js', 'const version = \'' + version + '\';');
                }
                done(true);
            });
        });
    });

    grunt.registerTask('restore-displayed-version', '', function () {
        grunt.file.write('scripts/version.js', 'const version = \'dev build\';');
    });

    // Default task(s).
    grunt.registerTask('default', ['jshint']);
    grunt.registerTask('release', ['bump-version', 'package', 'restore-displayed-version']);
};