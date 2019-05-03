# Smart RSS extension

Originally developed for Opera 15+ by BS-Harou (Martin Kadlec)

Translations are in scripts/nls/*.js

For technical bug reports use issues here on GitHub

## For users

Extension is available in following repositories:

### AMO: https://addons.mozilla.org/pl/firefox/addon/smart-rss-reader/

### Chrome Web Store: blocked by [#24](/../../issues/24)

### Opera Extensions: Awaiting moderation (since 2019.03.08)


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

Sometimes you may encounter texts ending with `*` or `!` in app, first ones are fallbacks to English text when used locale lacks the needed one and the latter are actual keys displayed when even English text is missing, feel free to submit PR's to fill them. If you change wording or punctuation somewhere please comment that line (using GitHub interface) with reasoning like common conventions or special punctuation rules in given language.


To check for jshint errors:
```
jshint .
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
