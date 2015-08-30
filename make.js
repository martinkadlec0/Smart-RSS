var formatDate = function() {
	var that;
	var addZero = function(num) {
		if (num < 10) num = "0" + num;
		return num;
	};
	var dateVal = function(all, found) {
		switch (found) {
			case "DD":
				return addZero(that.getDate());
			case "MM":
				return addZero(that.getMonth() + 1);
			case "YYYY":
				return that.getFullYear();
			default:
				return "";
		}
	};
	return function(date, str) {
		date = new Date(date);
		that = date;
		str = str.replace(/(DD|MM|YYYY)/g, dateVal);
		return str;
	};
}();


var ncp = require('ncp').ncp;
var cwd = process.cwd();

var fs = require('fs');
var exec = require('child_process').exec;

var packFolder = 'D:\\Work\\SMART RSS PACK';
var pemLocation = 'D:\\Work';

var prg = [
	'C:/Users/Martin/AppData/Local/Google/Chrome/Application/chrome.exe',
	'--pack-extension="' + packFolder + '"',
	'--pack-extension-key="' + pemLocation + '\\SMART RSS PACK.pem"'
];

date = formatDate(new Date(), 'YYYY-MM-DD');

var counter = 1;
while (fs.existsSync(pemLocation + '/smartrss.' + date + '.' + counter + '.nex')) {
	counter++;
}

var hash = '';

exec('git rev-parse master', handleHEAD);

function handleHEAD(error, stdout, stderr) {
	hash = stdout.replace(/\s/gm, '');
	exec('RMDIR "' + packFolder + '" /S /Q', handleRMDIR);
}


function handleRMDIR(error, stdout, stderr) {
	fs.mkdirSync(packFolder);
	ncpCopyFiles(handleRMGIT);
}


function handleRMGIT(error, stdout, stderr) {
	fs.writeFileSync(packFolder + '/scripts/version.js', 'var version = \'smartrss.' + date + '.' + counter + ' (' + hash + ')\';');
	exec(prg.join(' '), handlePACK);
}


function handlePACK(error, stdout, stderr) {
	exec('rename "' + pemLocation + '\\SMART RSS PACK.crx" "smartrss.' + date + '.' + counter + '.nex"', handleRENAME);
}

function handleRENAME(error, stdout, stderr) {
	console.log('Done');
}



function ncpCopyFiles(cb) {

	if (process.argv[2] == 'final') {
		var ignoreFiles = [
			/^node_modules/,
			/^docs/,
			/^\.git/,
			/^\.gitignore$/,
			/^todo.txt$/,
			/^package.json$/,
			/^README.md$/,
			/^Gruntfile.js$/,
			/^scripts\/app\/(?!modules)/,
			/^scripts\/app\/[^\/]+\/(?!Locale)[^\/]*/,
			/^scripts\/app\/app\.js$/,
			/^scripts\/bgprocess$/,
			/^scripts\/tests$/,
			/^scripts\/main\.js$/,
			/^scripts\/bgprocess\.js$/,
			/^scripts\/runtests\.js$/,
			/^make\.js$/,
			/\.map$/,
			/\.styl$/,
			/^(.*).sublime-(.*)$/
		];

		var okFiles = [
			'./scripts/app/modules/',
		];
	} else {
		var ignoreFiles = [
			/^node_modules/,
			/^docs/,
			/^\.git/,
			/^\.gitignore$/,
			/^todo.txt$/,
			/^make.js$/,
			/\.styl$/,
			/-compiled\.js$/,
			/-compiled\.js\.map$/,
			/^(.*).sublime-(.*)$/
		];

		var okFiles = [];
	}

	


	console.log(cwd);

	ncp('./', packFolder, {
		filter: function(name) {
			if (name == cwd) return true;

			name = name.replace(cwd + '/', '');
			console.log('Name: ' + name);
			for (var i = 0, j = ignoreFiles.length; i < j; i++) {
				if (name.match(ignoreFiles[i]) != null) {
					return false;
				}
			}

			return true;
		}
	}, function(err) {
		if (err) throw err;
		cb();
	});

}
