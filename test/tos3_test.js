// test/tos3.js

var expect = require('chai').expect;
var toS3 = require('../tos3');

describe('toS3', function() {
    describe('#encodeURI', function() {
        it('should encode a URL with spaces', function() {
            var url = 'abc def';
            var result = toS3.encodeURI(url);
            expect(result).to.equal('abc%20def')
        });
        it('should strip off leading / if it exists', function() {
            var url = '/abc def';
            var result = toS3.encodeURI(url);
            expect(result).to.equal('abc%20def')
        });
    });
});