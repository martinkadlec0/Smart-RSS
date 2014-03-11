# Smart RSS extension

Translations are in scripts/nls/*.js

For technical bug reports use issues here on GitHub

For bugs from user perspective use commments on:
http://blog.martinkadlec.eu/post/501-smart-rss-final-v10

## For developers

If you are interested in improving Smart RSS then there are few tips to get started. 

First of all you will need several command line tools:

- Git (obviously) - http://msysgit.github.io
- Node.JS & npm - http://nodejs.org
- Grunt-cli - http://gruntjs.com/getting-started (npm install -g grunt-cli)
- Mocha - http://visionmedia.github.io/mocha/ (npm install -g mocha) - for in-app integration tests I load mocha from cdn, but if you want to create out-of-app unit tests you will want to install this.

To setup your Smart RSS project open your console, go to your projects folders and type:
```
git clone git@github.com:BS-Harou/Smart-RSS.git smartrss
cd smartrss
npm install
```

You should also create .gitignore file including at least:
```
node_modules/*
docs/*
*.map
*-compiled.js
*.sublime-*
```
(\*.sublime-\* only if you use sublime text projects)

To check for jshint errors:
```
grunt jshint
```

To compile stylus files to css:
```
grunt stylus
```

You can also use watch task that will automatically compile your stylus files on change:
```
grunt watch
```

To generate source documentaion in ./docs run:
```
grunt yuidoc
```

In dev. builds you can run integration tests by pressing shift+insert directly in smart rss tab.

When you are done editing the code you should compile all the js files:
```
grunt rjs
```


and then switch to "publish" branch that will make index.html (bgprocess) and rss.tml (app) use the compiled files instead of loading all the files separately.
```
git checkout publish
```

Then you can use Opera to make extenion out of it. Opera will automatically ignore all files and folders beggining with "." like ".git", but you might want to remove some other files too (like sublime text projects files). You have to do this manually or use some script that will do this for you. I have a script to do this but it is not yet ready to get published. In future it might work like this:

```
grunt build
```