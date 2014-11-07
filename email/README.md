Email Template Boilerplate
==========================

Quick Start
------------

To install, run
    $ npm install && bower install

Edit the HTML file templates in src/templates

The copy decks are in src/decks. Anything prefixed with an underscore
will be ignored by the build process. There is a special `_meta` tag
that allows you to override some behaviors such as specifying which
version to use as a default.

Styles are specified in src/styles/main.scss. It's SCSS, so you can
use all of that syntax. The Zurb Ink has been cusomized so you can
replace variables such as the default padding size.

There are wrappers around the common Zurb Ink patterns,
these are all implemented in the gulpfile.js. The most
common are:
  * zurb.container
  * zurb.row
  * zurb.n_cols (for n from "one" to "twelve")
  * zurb.last_n_cols (for n from "one" to "twelve")
  * zurb.center
  * zurb.pad
Rembmer that if you aren't using zurb.center or zurb.pad within a zurb.n_cols,
you need to add your own default <td>.

You need to add border="0" to all images, or Microsoft products will add
a border no matter what the stylesheet says.

Gulp Commands
-------------

    $ gulp
The default is to launch the server and watcher and open an index page.
This will tie up your terminal, so launch it in a throw-away terminal.

    $ gulp build
Builds SCSS into CSS; inlines the CSS; compresses the images; and assembles
everything in the build directory.

    $ gulp zip
Runs build and then creates a time-stamped ZIP file in the dist folder.
