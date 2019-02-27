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

To create package uploadable to various extension repositories 
```
grunt release
```
this will automatically bump version in manifest.json, commit the change and create zip file

To create zip file only use 
```
grunt package
```