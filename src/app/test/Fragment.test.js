const assert = require('assert');
const should = require('should');
const _ = require('lodash');
const Fragment = require('../Fragment');

// CAVEAT: this test suite is not very complex and may forget some cases.
// Don't hesitate to add your own.
describe('Fragment', () => {
  Fragment.verbose = false;

  describe('.parseTemplate (static method)', () => {
    it('shouldn\'t err while reading an existing template', () => {
      let template = 'the_one_fragment';
      let result = {};

      let error = Fragment.parseTemplate(template, result);

      should(error).equal(null);
    });

    it('should err while reading a non existing template', () => {
      let template = 'the_non_existing_fragment';
      let result = {};

      let error = Fragment.parseTemplate(template, result);

      error.code.should.equal('ENOENT');
    });

    it('should return an Object with full properties', () => {
      let template = 'the_one_fragment';
      let result = {};

      Fragment.parseTemplate(template, result);
      result.should.be.an.instanceOf(Object);
      result.should.have.property('head');
      result.should.have.property('title');
      result.should.have.property('url');
      result.should.have.property('body');
      result.should.have.property('foot');
      result.should.have.property('attr');
    });
  });

  describe('Object', () => {
    let fragment = new Fragment('my_fragment', 'the_one_fragment');

    it('should have name and core properties', () => {
      fragment.should.have.property('name');
      fragment.should.have.property('core');
    });

    it('should have correct name value based on given argument', () => {
      fragment.name.should.equal('my_fragment');
    });

    it('should have a core with full properties', () => {
      let core = fragment.core;

      core.should.have.property('head');
      core.should.have.property('title');
      core.should.have.property('url');
      core.should.have.property('body');
      core.should.have.property('foot');
      core.should.have.property('attr');
    });

    it('should have all the required methods', () => {
      fragment.toJSON.should.be.Function();
      fragment.merge.should.be.Function();
      fragment.dump.should.be.Function()
    });

    describe('curried with', () => {
      describe('url', () => {
        let fragment = new Fragment('my_fragment', 'the_one_fragment');

        fragment.curry({url: 'my_other_url'});

        it('should be the url property', () => {
          fragment.core.url.should.not.equal('my_url');
          fragment.core.url.should.equal('my_other_url');
        });
      });

      describe('title', () => {
        let fragment = new Fragment('my_fragment', 'the_one_fragment');

        fragment.curry({title: 'my_other_title'});

        it('should override the title property', () => {
          fragment.core.title.should.not.equal('my_title');
          fragment.core.title.should.equal('my_other_title');
        });
      });

      describe('attr', () => {
        let fragment = new Fragment('my_fragment', 'the_one_fragment');

        fragment.curry({attr:'some-element.attribute=foo,a-whole-new-element.attribute=bar'});

        it('should override the existing attributes', () => {
          fragment.core.attr['some-element']['attribute'].should.not.equal('value');
          fragment.core.attr['some-element']['attribute'].should.equal('foo');
        });

        it('should create a new attribute when no previous attributes exist with the same target', () => {
          fragment.core.attr['a-whole-new-element']['attribute'].should.equal('bar');
        });

        it('should not overwrite previous attributes', () => {
          fragment.core.attr['some-other-element']['attribute'].should.equal('123');
        });
      });

      describe('head', () => {
        let fragment = new Fragment('my_fragment', 'the_one_fragment');

        fragment.curry({head:'<some-html>...</some-html>'});

        it('should override or create the head value', () => {
          fragment.core.head.should.equal('<some-html>...</some-html>');
        });
      });

      describe('foot', () => {
        let fragment = new Fragment('my_fragment', 'the_one_fragment');

        fragment.curry({foot:'<some-html>...</some-html>'});

        it('should override or create the foot value', () => {
          fragment.core.foot.should.equal('<some-html>...</some-html>');
        });
      });

      describe('targets', () => {
        describe('incomplete', () => {
          let fragment = new Fragment('my_fragment', 'the_one_fragment');

          fragment.curry({targets: 'new-parent-container'});

          let body = fragment.core.body;
          let targets = [];

          for (let i = 0; i < body.length; i++) {
            targets.push(body[i].target);
          }

          it('should override only the existing targets', () => {
            targets.should.not.containEql('parent-container');
            targets.should.containEql('new-parent-container');
            targets.should.containEql('other-parent-container');
          });
        });

        describe('surnumerous', () => {
          let fragment = new Fragment('my_fragment', 'the_one_fragment');

          fragment.curry({targets: 'new-parent-container,new-other-parent-container,some-surnumerous-parent-container'});

          let body = fragment.core.body;
          let targets = [];

          for (let i = 0; i < body.length; i++) {
            targets.push(body[i].target);
          }

          it('should override all the existing targets and drop the surnumerous', () => {
            targets.should.not.containEql('parent-container');
            targets.should.containEql('new-parent-container');
            targets.should.not.containEql('other-parent-container');
            targets.should.containEql('new-other-parent-container');
            targets.should.not.containEql('some-surnumerous-parent-container');
          });
        });
      });
    });
  });

  describe('toJSON', () => {
    let fragment = new Fragment('my_fragment', 'the_one_fragment');
    let json = fragment.toJSON();

    it('should be a String', () => {
      let error = null, data = null;

      json.should.be.String();
    });

    it('should be parsable as JSON', () => {
      let error = null, data = null;

      try {
        data = JSON.parse(json)
      } catch (e) {
        error = e;
      } finally {
        should(data).be.ok();
        should(error).not.be.ok();
      }
    });

    it('should transform the body array into an object', () => {
      let error = null, data = null;

      try {
        data = JSON.parse(json)
        data.body.should.be.Object();
      } catch (e) {
        error = e;
      }
    });
  });

  describe('merge', () => {
    let f1 = new Fragment('my_fragment', 'the_one_fragment');
    let f2 = new Fragment('my_fragment', 'the_second_fragment');
    let oldf1 = _.cloneDeep(f1);

    f1.merge(f2);

    it('should overwrite the simple properties', () => {
      f1.core.title.should.equal('my_second_title');
      f1.core.url.should.equal('my_second_url');
    });

    it('should concatenate the head', () => {
      f1.core.head.should.equal(oldf1.core.head + f2.core.head);
    });

    it('should concatenate the foot', () => {
      if (f2.core.foot === undefined) {
        f2.core.foot = '';
      }
      f1.core.foot.should.equal(oldf1.core.foot + f2.core.foot);
    });

    it('should concatenate the existing targets in body', () => {
      let body = f1.core.body;

      body.should.containEql({target: 'parent-container', content: oldf1.core.body[0].content + f2.core.body[0].content});
    });

    it('should create a new target in body if not existing', () => {
      let body = f1.core.body;

      body.should.containEql({target: 'third-parent-container', content: f2.core.body[1].content});
    });

    it('should merge the two `attr`', () => {
      let attr = f1.core.attr;
      let dest = _.cloneDeep(oldf1.core.attr);
      let src = f2.core.attr;
      let t = _.merge(dest, src);

      attr.should.have.property('some-element');
      attr.should.have.property('some-other-element');
      attr.should.have.property('some-third-element');
      attr['some-element'].should.eql(t['some-element']);
      attr['some-other-element'].should.eql(t['some-other-element']);
      attr['some-third-element'].should.eql(t['some-third-element']);
    });
  });
});
