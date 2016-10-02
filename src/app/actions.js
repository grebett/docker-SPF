const conf = require('./conf');
var Fragment = require('./Fragment');

Fragment.verbose = true;

/*  sendFragment(req ExpressRequest, res ExpressResponse) void

    Serve one fragment in JSON, curried with parameters.
    If more than one fragment is asked, the fragments are merged to serve a single fragment. */
exports.sendFragment = function (req, res) {
  let allFragmentsPaths = req.path.split('+');
  let fragmentPath = allFragmentsPaths[0];
  let queryFragments, exploded, fragment, basePath;

  exploded = fragmentPath.split('/');
  exploded[exploded.length - 1] = '';
  exploded.shift();
  basePath = exploded.join('/');

  // if ?page is provided
  if (req.query.page) {
    queryFragments = req.query.page.split(' ');

    allFragmentsPaths = [...allFragmentsPaths, ...queryFragments];
  }

  // read the first fragment
  try {
    fragment = new Fragment('could_be_used_if_fragments_are_stocked', fragmentPath);
  } catch (error) {
    if (error.name === 'Error404') {
      res.status(404).send(error.message);
    }
  }

  // if more than one fragment, merge them
  if (allFragmentsPaths.length > 1) {
    for (let i = 1; i < allFragmentsPaths.length; i++) {
      let toMerge;

      // if a single fragment is missing, return a 404 or continue, according to conf
      try {
        fragmentPath = basePath + allFragmentsPaths[i].replace(/\./g, '/');
        toMerge = new Fragment('each_fragment_should_receive_a_name', fragmentPath);
      } catch (error) {
        if (error.name === 'Error404') {
          if (conf.missingFragmentBehavior === 'stop') {
            res.status(404).send(error.message);
          } else {
            console.error(error.message);
            continue;
          }
        } else {
          throw error;
        }
      }

      fragment.merge(toMerge);
    }
  }

  // curry the fragment
  let params = req.query;
  fragment.curry(params);

  // send the fragment
  res.set('Content-Type', 'application/json');
  res.send(fragment.toJSON());
};
