const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const _ = require('lodash');

// Custom error used if one of the asked fragment's template doesn't exist
function Error404(message) {
  this.name = 'Error404';
  this.message = message;
  this.stack = (new Error()).stack;
}
Error404.prototype = new Error;

/*  Fragment(name String, template String) Fragment
*/
class Fragment {
  set verbose(value) {
    Fragment.verbose = value;
  }

  constructor(name, template) {
    this.name = name;
    this.template = template;
    this.core = {};

    // parse Fragment template and put results into the core
    let error = Fragment.parseTemplate(template, this.core);

    if (error) {
      if (error.code === 'ENOENT') {
        throw new Error404(`Oups: ${name} does not exist!`);
      } else {
        throw error;
      }
    }

    // log the work done
    if (Fragment.verbose) {
      console.log(`New fragment '${name}' build with ${Object.keys(this.core)}`);
    }
  }

  /*  curry(params Object) void

      Customize the fragment with the provided parameters:
      attr(Optional): String, formatted as `target.attribute=foo,other_target.attribute=bar`
      foot(Optional): String (of HTML)
      head(Optional): String (of HTML)
      targets(Optional): String, formatted as `first_target[],second_target`
      title(Optional): String
      url(Optional): String */
  curry(params) {
    let properties = ['attr', 'foot', 'head', 'title', 'targets', 'url'];

    for (let i = 0; i < properties.length; i++) {
      let value = params[properties[i]];
      // if the property is provided, override
      if (value) {
        // explode and apply the attributes
        if (properties[i] === 'attr') {
          let attrs = {};
          let s = value.split(',');

          for (let i = 0; i < s.length; i++) {
            let matches, target, attribute, value;

            matches = s[i].match(/([\d\w-_]+)\.([\d\w-_]+)=([\d\w-_]+)/);
            [, target, attribute, value] = matches; //es6 destructuring
            if (!this.core.attr[target]) {
              this.core.attr[target] = {};
            }
            this.core.attr[target][attribute] = value;
          }
        }
        // apply the defined targets in order, ignore the surnumerous ones
        else if (properties[i] === 'targets') {
          let targets = value.split(',');

          for (let i = 0; i < this.core.body.length; i++) {
            if (targets[i] !== undefined) {
              this.core.body[i].target = targets[i];
            }
          }
        }
        // for every other properties, simply overwrite them
        else {
          this.core[properties[i]] = value;
        }
      }
    }
  }

  /*  merge(fragment Fragment) void

      Merges two fragments, title and url are overwritten, attributes and body are merged, other incremented.
      The fragment name is curried, composed of the two names joined by a `+`. */
  merge(fragment) {
    // curry the name
    this.name += `+${fragment.name}`;

    // for each key in the source fragment's core to merge
    for (let key in fragment.core) {
      // url and title are overwritten
      if (key === 'url' || key === 'title') {
        this.core[key] = fragment.core[key];
      }
      // body is merged
      else if (key === 'body') {
        // create the body if not existing
        if (!this.core.body) this.core.body = [];

        // for each body's containers in the fragment to merge (source)
        for (let i = 0; i < fragment.core.body.length; i++) {
          // find if there is some existing destination with the same target
          let existing = _.find(this.core.body, (container) => {
            return container.target === fragment.core.body[i].target;
          });

          // if existing, append the content, else, create a new entry
          if (existing) {
            existing.content += fragment.core.body[i].content;
          } else {
            this.core.body.push(fragment.core.body[i]);
          }
        }
      }
      // some attributes need to be concatened (class for example), other are overwritten
      else if (key === 'attr') {
        // create the attributes if not existing
        if (!this.core.attr) this.core.attr = {};

        this.core.attr = _.merge(this.core.attr, fragment.core.attr);
      }
      // every other core properties are concatened
      else {
        if (!this.core[key]) this.core[key] = '';

        this.core[key] += fragment.core[key];
      }
    }
  }

  /*  toJSON(void) String

      Returns the JSON representation of the fragment's core:
      Typically, a SPF response is formatted as below:
      "{
        "title": "my_title",
        "url": "/some_url",
        "head": "<link />...",
        "attr": {"id": {"some_attribute": "some_value"}},
        "body": {"target": "some_id", "content": "<p>...</p>"},
        "head": <script>...</script>"
      }" */
  toJSON() {
    // the body is an array, but we need to transform it to an object for matching SPF format
    if (this.core.body) {
      let flatten = {};

      for (let i = 0; i < this.core.body.length; i++) {
        let container = this.core.body[i];

        flatten[container.target] = container.content;
      }
      this.core.body = flatten;
    }
    return JSON.stringify(this.core);
  }

  /*  dump(log Boolean) Fragment

      Logs and returns the Fragment for debug purpose. */
  dump(log) {
    if (log) {
      console.log(this);
    }
    return this;
  }

  /*  parseTemplate(params Object, core Fragment.core) Error

      Reads a template and parse it, copying the result into the core of a specific fragment. */
  static parseTemplate(template, core) {
    let templatePath = path.join('/usr/html/fragments/', template, 'index.html');
    let parts = ['head', 'body', 'foot', 'attributes'];
    let data, html, $;

    // read template
    try {
      data = fs.readFileSync(templatePath);
    } catch (error) {
      return error;
    }

    // converts buffer to string and interpret is as HTML
    html = data.toString('utf-8');
    $ = cheerio.load(html);

    // parse the HTML
    for (let i = 0; i < parts.length; i++) {
      let part = parts[i];
      let $part = $(part);

      // if part is absent, go to the next one
      if (!$part[0]) {
        continue;
      }

      // each part may need a specific action
      let nodes;
      switch ($part[0].name) {
        // the body may contain a for attribute that defines the target of this fragment's content
        case 'body':
          nodes = $part.children();

          core.body = [];
          for (let i = 0; i < nodes.length; i++) {
            let $child = $(nodes[i]);

            core.body.push({
              target: $child.attr('for') || 'container',
              content: $child.html()
            });
          }
          break;
        // the <attributes> tag's children contains the list of attribute to update for each target designed by its id
        case 'attributes':
          nodes = $part.children();

          core.attr = {};
          for (let i = 0; i < nodes.length; i++) {
            let child = nodes[i];
            let target = child.attribs.id;

            delete child.attribs.id;
            core.attr[target] = child.attribs;
          }
          break;
        // we stock the url as a meta in the head; same for the title, to display it when we render the fragment solely
        case 'head':
          // first get the title
          let $title = $part.find('title');
          let title = $title.text();

          if (title) {
            core.title = title;
            $title.remove();
          }

          // then the url
          let $url = $part.find('meta[url]');
          let url = $url.attr('url');

          if (url) {
            core.url = url;
            $url.remove();
          }
        // every other parts (well, just the foot for now...)
        default:
          core[part] = $part.html();
      }
    }
    return null;
  }
}

module.exports = Fragment;
