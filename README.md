#SSAParser

A tool to parse your Social Security Administration earnings PDF into your projected full retirement benefit.

Application is deployed on [Heroku](http://ssaparser.herokuapp.com/) if you want to test it out.

This is HTML5 application, built with [Brunch](http://brunch.io) and uses [PDF.js](http://mozilla.github.io/pdf.js/) to parse the PDF all in the browser.

## Getting started
* Install (if you don't have them):
    * [Node.js](http://nodejs.org): `brew install node` on OS X
    * [Brunch](http://brunch.io): `npm install -g brunch`
    * [Bower](http://bower.io): `npm install -g bower`
    * Brunch plugins and Bower dependencies: `npm install & bower install`.
* Run:
    * `brunch watch -s` — watches the project with continuous rebuild. This will also launch HTTP server with [pushState](https://developer.mozilla.org/en-US/docs/Web/Guide/API/DOM/Manipulating_the_browser_history).
    * `brunch build --production` — builds minified project for production
