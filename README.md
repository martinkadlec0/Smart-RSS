# Smart RSS extension

Originally developed for Opera 15+ by BS-Harou (Martin Kadlec)

Translations are in scripts/nls/*.js

For technical bug reports use issues here on GitHub

## For developers

If you are interested in improving Smart RSS then there are few tips to get started. 

First of all you will need several command line tools:

- Git (obviously) - http://msysgit.github.io
- Node.JS & npm - http://nodejs.org
- Grunt-cli - http://gruntjs.com/getting-started (npm install -g grunt-cli)

To setup your Smart RSS project open your console, go to your projects folders and type:
```
git clone git@github.com:zakius/Smart-RSS.git smartrss
cd smartrss
npm install
```


To check for jshint errors:
```
grunt jshint
```

To compile stylus files to css:
```
grunt stylus
```


When you are done editing the code you can compile all the js files:
```
grunt rjs
```

Files required for extension to run after building:
````
images/*
scripts/app/modules/Locale.js
scripts/app/libs/*
scripts/nls/*
scripts/options/*
scripts/bgprocess-compiled.js
scripts/domReady.js
scripts/main-compiled.js
version.js
sounds/*
styles/main-compiled.css
styles/options.css
index.html
manifest.json
options.html
rss.html
rss_content.html
````

additionally you have to modify index.html and rss.html to load compiled files instead, when you do you can bundle the extension according to your browsers instructions
