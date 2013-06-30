// test/tos3.js

var expect = require('chai').expect;
var toS3 = require('../tos3'),
    Stream = require('stream');

describe('toS3', function () {
    describe('#encodeURI', function () {
        it('should encode a URL with spaces', function () {
            var url = 'abc def';
            var result = toS3.encodeURI(url);
            expect(result).to.equal('abc%20def');
        });
        it('should strip off leading / if it exists', function () {
            var url = '/abc def';
            var result = toS3.encodeURI(url);
            expect(result).to.equal('abc%20def');
        });
    });

    describe('#searchStringInArray', function () {
        it('should find a string and return >= 0', function () {
            var result = toS3.searchStringInArray('found', ['is', 'this', 'found']);
            expect(result).to.equal(2);
        });
        it('should return -1 if string not found', function () {
            var result = toS3.searchStringInArray('notfound', ['is', 'this', 'found']);
            expect(result).to.equal(-1)
        });
        it('should return -1 if empty array', function () {
            var result = toS3.searchStringInArray('notfound', []);
            expect(result).to.equal(-1)
        });
    });

    describe('#md5calc', function () {
        var md5;

        beforeEach(function (done) {
            var fileStream = new Stream();

            toS3.md5calc(fileStream, function (err, result) {
                md5 = result;
                done();
            });

            fileStream.emit('data', 'this is my string');
            fileStream.emit('end');
        });

        it('should calc proper MD5', function () {
            expect(md5).to.equal('6363f0d465541022f9b743c2f745b493');
        });
    });




});


