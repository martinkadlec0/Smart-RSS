module.exports = function (grunt) {

    const {join, dirname} = require('path');
    const {readdirSync, lstatSync, existsSync} = require('fs');


    const cleanup = function () {
        const defaultConfig = {
            removeFromManifest: [],
            alwaysPackage: true,
            root: null,
            versionsFile: null
        };
        const config = Object.assign(defaultConfig, this.data);
        const root = config.root ? join(__dirname, 'dist', config.root) : join(__dirname, 'dist', this.target);
        const manifestPath = join(root, 'manifest.json');
        const originalManifest = grunt.file.readJSON(manifestPath);
        let newManifest = Object.assign({}, originalManifest);
        if (config.csp) {
            newManifest['content_security_policy'] = newManifest[config.csp];
            delete newManifest[config.csp];
        }
        if (config.removeFromManifest) {
            config.removeFromManifest.forEach((item) => {
                delete newManifest[item];
            });
        }
        grunt.file.write(manifestPath, JSON.stringify(newManifest, null, 2));
    };

    const commit = function (level = 'patch') {
        let {exec} = require('child_process');
        let done = this.async();
        exec('git add *', (err, stdout, stderr) => {
            if (err) {
                console.log(`stderr: ${stderr}`);
                done(false);
                return;
            }
            exec(`git commit -m "auto version bump: ${level}"`, (err) => {
                if (err) {
                    done(false);
                    return;
                }
                done(true);
            });
        });
    };

    const bumpVersion = function (level = 'patch') {
        const semver = require('semver');
        const md5File = require('md5-file');

        const manifestPath = join(__dirname, 'src/manifest.json');
        const manifest = grunt.file.readJSON(manifestPath);
        manifest.version = semver.inc(manifest.version, level);
        grunt.file.write(manifestPath, JSON.stringify(manifest, null, 2));

        const versionsPath = join(__dirname, '/src/rssDetector/manifest.json');
        const versions = Object.assign(existsSync(versionsPath) ? grunt.file.readJSON(versionsPath) : {}, {
            files: [],
            package: false
        });

        let newVersions = {
            files: [],
            package: false
        };
        const filesList = [];

        const scan = (dir) => {
            readdirSync(dir).forEach((file) => {
                if (file[0] === '.') {
                    return;
                }
                const filePath = join(dir, file);
                if (lstatSync(filePath).isDirectory()) {
                    scan(filePath);
                    return;
                }
                filesList.push(filePath);
            });
        };
        const detectorPath = join(__dirname, 'src/rssDetector');
        scan(detectorPath);
        filesList.forEach((item) => {
            const hash = md5File.sync(item);
            const fileName = item.split('\\').pop().split('/').pop();
            if (fileName === 'manifest.json') {
                return;
            }
            newVersions.files[fileName] = hash;
            if (!versions.files[fileName] || versions.files[fileName] !== newVersions.files[fileName]) {
                newVersions.package = true;
            }
        });
        grunt.file.write(versionsPath, JSON.stringify(newVersions, null, 2));
        const detectorManifestPath = join(detectorPath, 'manifest.json');
        const detectorManifest = grunt.file.readJSON(detectorManifestPath);
        detectorManifest.version = semver.inc(detectorManifest.version, level);
        grunt.file.write(detectorManifestPath, JSON.stringify(detectorManifest, null, 2));
    };


    const zip = function () {
        const defaultConfig = {
            dirname: this.target,
            alwaysPackage: true,
            skip: []
        };
        const config = Object.assign(defaultConfig, this.data);
        const root = join(__dirname, 'dist', config.dirname);
        const manifestPath = join(root, 'manifest.json');


        const filesList = [];

        const scan = (dir) => {
            readdirSync(dir).forEach((file) => {
                if (file[0] === '.') {
                    return;
                }
                const filePath = join(dir, file);
                let skip = false;
                config.skip.forEach((blacklisted) => {
                    if (filePath.includes(blacklisted)) {
                        skip = true;
                    }
                });


                if (lstatSync(filePath).isDirectory()) {
                    scan(filePath);
                    return;
                }
                filesList.push(filePath);
            });
        };
        scan(root);


        const createPackage = config.alwaysPackage || grunt.file.readJSON(join(root, 'versions.json')).package;

        if (createPackage) {
            const version = getVersion(manifestPath);
            const AdmZip = require('adm-zip');
            const zipFile = new AdmZip();
            filesList.forEach((file) => {
                // TODO: shorten somehow, make sure that `path` doesn't contain leading slashes nor backslashes
                let path = dirname(file).replace(root + '/', '').replace(root + '\\', '').replace(root, '');

                zipFile.addLocalFile(file, path);
            });
            zipFile.writeZip(join(__dirname, 'dist', 'SmartRSS_v' + version + '_' + this.target + '.zip'));
        }
    };

    const getVersion = function (manifest) {
        return grunt.file.readJSON(manifest).version;
    };


// Project configuration.
    grunt.initConfig({
        watch: {
            scripts: {
                files: ['src/**/*'],
                tasks: ['prepare'],
                options: {
                    spawn: true
                }
            }
        },
        cleanup: {
            firefox: {
                removeFromManifest: [
                    'chromium_content_security_policy'
                ]
            },
            chromium: {
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
                root: 'chromium_detector',
                versionsFile: 'versions.json'
            }
        },
        copy: {
            firefox: {
                files: [{
                    expand: true,
                    cwd: './src/',
                    src: [
                        '**/*',
                        '!rssDetector/manifest.json'
                    ],
                    filter: 'isFile',
                    dest: './dist/firefox/'
                }]
            },
            chromium: {
                files: [{
                    expand: true,
                    cwd: './src/',
                    src: [
                        '**/*',
                        '!rssDetector/*'
                    ],
                    filter: 'isFile',
                    dest: './dist/chromium/'
                }]
            },
            detector: {
                files: [
                    {
                        expand: true,
                        cwd: './src/rssDetector/',
                        src: [
                            '**/*'
                        ],
                        filter: 'isFile',
                        dest: './dist/chromium_detector/'
                    }
                ]
            }
        },
        package: {
            detector: {
                dirname: 'chromium_detector',
                alwaysPackage: false
            },
            firefox: {},
            chromium: {}
        }

    });

    grunt.registerTask('bump-version', '', bumpVersion);
    grunt.registerTask('commit', '', commit);
    grunt.registerTask('package', ['prepare', 'zip']);

    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.registerMultiTask('cleanup', '', cleanup);
    grunt.registerMultiTask('zip', '', zip);
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.registerTask('prepare', ['copy', 'cleanup']);





    grunt.registerTask('release', '', function (level = 'patch') {
        grunt.task.run('bump-version:' + level);
        grunt.task.run('commit:' + level);
        grunt.task.run('package');
    });

};
