# A container for SPF websites

## About
[Structured Page Fragments (SPF)](https://youtube.github.io/spfjs/) is a lightweight JS framework for fast navigation and page updates from YouTube.

When asking for a resource, SPF expects the server to send HTML fragments, using JSON as a transport.

This [Docker](https://www.docker.com/) container, inheriting from [smebberson's Alpine Linux containers](https://github.com/smebberson/docker-alpine), proposes a simple stack for building SPF websites, using:

+ an [Nginx](https://www.nginx.com/) server to handle first page requests and static content, and proxying SPF requests to...
+ ...an [ExpressJS](http://expressjs.com/) server, that responds with JSON fragments

## Caveat

This documentation may not be fully comprehensible without a previous knowledge of [SPF](https://youtube.github.io/spfjs/documentation/), [Docker](https://docs.docker.com/), [Nginx](https://www.nginx.com/resources/admin-guide/), [Node.js](https://nodejs.org/en/docs/) and [Express](http://expressjs.com/en/guide/routing.html). Please refer to their respective documentations if something is unclear.

Furthermore, this Docker container stack is very opinionated and might not fit all your needs. As SPF can be used with a lot of different backends and for different purposes, feel free to fork and modify it as you wish.

## How to use

### Build the image and run the container

Docker uses a Dockerfile to build its images. If you are not used to Docker building process, the [builder documentation](https://docs.docker.com/engine/reference/builder/) should be a good read.

To build the image, `cd` into the directory containing the Dockerfile and run:
``` shell
$ docker build -t my-image .
```

A container should be created. To launch it, run:
``` shell
$ docker run --name my-container -d -p 8080:80 -p 3000:3000 my-image
```

To customize ports, refer to local configuration files: `/conf/nginx.conf` and `/src/app/config.js`.

### Manipulating the container

The container can be manipulated from the host using the docker commands. A full list of commands can be listed using `docker --help`.

Some shell scripts may be added in the near future to simplify the container control. Meanwhile, here is a list of useful commands:

**Push the website source to the container's nginx rendering directory:**
``` shell
$ docker cp public/. my-container:/usr/html
```

**Push the Express app source to the container's one:**
``` shell
$ docker cp app/. my-container:/app && docker exec my-container npm install --silent && docker restart my-container --time 0
```

**Attach to the container stdout (for watching logs directly for instance):**:
``` shell
$ docker attach --sig-proxy=false my-container
```

**Execute a shell into the container (a bit like connecting to it via ssh):**
``` shell
$ docker exec -it my-container sh
```

### Running the test suites

Internally, tests are run using [mocha](https://mochajs.org/). Test suites can be found in the `/app/test` directory.

**To run the test suites, simply execute:**
``` shell
$ docker exec my-container npm test
```

The test plan is focused on the `Fragment` class. Don't hesitate to add every appropriate test.

## Time to code

### Web pages

All the web pages source code is stored in the `/src/public` directory.
The `/src/public/pages` directory contains every pages that can be directly accessed on a browser's initial request. This pages can be written in complete static html (better for SEO) or use javascript to load SPF fragments.

### Fragments

A fragment is a JSON object following the convention defined in [SPF documentation](http://youtube.github.io/spfjs/documentation/responses/).

This JSON is generated from an template file using the `Fragment` class. Designed to be very close to HTML so that it can be displayed by static servers as a stand alone web page to ease the development, the fragments are contained in the `/src/public/fragments` directory. A typical fragment looks like below:

``` HTML
<!-- the_one_fragment -->
<head>
    <title>my title</title>
    <meta url="my_url">
    <link rel="stylesheet" href="/fragments/the_one_fragment/main.css" media="screen" title="no title">
</head>

<body>
    <div class="container" for="parent-container">
        <img src="/fragments/the_one_fragment/image.jpeg" alt="image" />
        <p>
            Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor
            incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
            exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor
            in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur
            sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
        </p>
    </div>
    <div class="container" for="other-parent-container">
        <ul>
            <li>1</li>
            <li>2</li>
            <li>3</li>
        </ul>
    </div>
</body>

<foot>
</foot>

<attributes>
    <div id="some-element" attribute="false"></div>
    <div id="some-other-element" other-attribute="123"></div>
</attributes>
```

As explained in the following list, the templates nodes play all a specific role:

+ `<head>` → all the child nodes contained in this tag will be copied into the `head` property of the JSON fragment response – mainly used for the stylesheets
+ `<title>` → in the head tag, the title will become the `title` property of the JSON
+ `<meta url="some_url">` → in the head tag, the url attribute of this tag will become the `url` property of the JSON
+ `<body>` → all the child nodes contained in this tag will be append into`body` property of the JSON fragment response sorted by targets matching the `for` attributes of each nodes
+ `<foot>` → all the nodes contained in this tag will be copied into the `foot` property of the JSON fragment response – mainly used for the scripts
+ `<attributes>` → all the nodes contained in this tag will be transformed as an Object – the `id` attribute will target the matching node in your final page and the attributes provided will modify it accordingly

#### Querying a fragment

To query a fragment, client should send a GET request formatted as below:

``` shell
$ curl /some_fragment&spf=some_action
```

...where `some_action` is `navigate` or `load`.

This will look for an `index.html` file into the `/public/fragments/some_fragment/` directory, parse it as explained in the last section, then send the result as a JSON fragment.

Note that one query will always return a single fragment. To query more than one fragment, you have two options:
+ call `spf.load()` several times in a script
+ query a merged fragment (cf next section)

#### Merging two or more fragments

Two or more fragments can be combined using a single query into a single JSON response.
We offer you two ways of asking for multiple fragments, the preferred one should depend on the usage.

##### 1) the f1+f2 notation

``` shell
$ curl /some_directory/first_fragment+second_fragment?spf=some_action
```

... will merge `/some_directory/first_fragment` and `/some_directory/second_fragment`. If an user enters the URL without the `spf` parameter (manual reloading, direct access to URL, etc), the server will try to serve`/public/pages/some_directory/first_fragment+second_fragment.html`.

##### 2) the f1/?page=f2 approach

``` shell
$ curl /some_directory/first_fragment/?page=second_fragment&spf=some_action
```

... will ask for two fragments  `/some_directory/first_fragment` and `/some_directory/second_fragment`. If an user enters the URL without the `spf` parameter (manual reloading, direct access to URL, etc), the server will try to serve`/public/pages/some_directory/first_fragment.html`.

##### Fragments location and subdirectories
Be caution. The second fragment should be either in the same directory than the first fragment or within one of its subdirectories. To target a subdirectory, use the following dot notation: `subdirectory.fragment`

To ask for more than two fragments at the same time, add as many fragments joined by the `+` sign:

``` shell
$ curl /some_directory/first_fragment+second_fragment+...+last_fragment?spf=some_action
$ curl /some_directory/first_fragment/?page=second_fragment+...+last_fragment&spf=some_action
```

##### How fragments are merged?
Merging two fragments follow this behavior: the second fragment data is applied to the first fragment:
+ `title` and `url` are overwritten
+ `attributes` and `body` are merged
+ the other properties are incremented by concatenation.

If there is more than two fragments, the operation is renewed for each other fragments, merging the result of the previous merge with the following fragment in the list.

#### Curry a fragment

Although the properties needed to build the JSON representation of a fragment are to be found in the template itself, you can overwrite these values by providing one or more properties described along to the query:
+ `title` → changes the title of a fragment – String
+ `url` → changes the url of a fragment – String
+ `head` → changes the whole head – HTML as a String
+ `attr` → changes the whole attributes – String formatted as follow: `some-element.attribute=foo,a-whole-new-element.attribute=bar`
+ `foot` → changes the whole body – HTML as a String
+ `targets` → changes the body `for` targets – String formatted as follow: `first_target,second_target`

As you can see, liberty is given to you to modify the whole fragment except its `body` itself (indeed, if you have to modify the whole `body`, you need actually a new fragment).
Please consider the legitimacy of such an operation before proceeding. Some better methods may be preferred to avoid useless communication between the server and the client, for instance by using the [spf.process method](https://youtube.github.io/spfjs/api/#spf.process).

#### Templating support

The fragments do not support templating. This feature may be added in the near feature, either using [Lodash template method](https://lodash.com/docs/4.16.2#template) or [Handlebars](http://handlebarsjs.com/).

## Contributions

This container is still a work in progress. Code tries to be simple and well documented. All contributions and advices are very welcome.

## License

The MIT License (MIT) Copyright (c) 2016 grebett

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
