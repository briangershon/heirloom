// test/tos3.js

var expect = require('chai').expect;
var toS3 = require('../tos3'),
    stream = require('stream'),
    events = require('events');

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

    describe('#md5Calc', function () {
        var md5;

        beforeEach(function (done) {
            var fileStream = new stream();

            toS3.md5Calc(fileStream, function (err, result) {
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


    describe('#etagLookup (file exists)', function () {
        var etag,
            client = {},
            filePathToBackup = '',
            e = new events.EventEmitter;

        e.end = function () {};

        client.head = function () {
            return e;
        };

        beforeEach(function (done) {
            toS3.etagLookup(client, filePathToBackup, function (err, result) {
                etag = result;
                done();
            });

            var res = {
                headers: {
                    etag: '6363f0d465541022f9b743c2f745b493'
                }
            };
            e.emit('response', res);
        });

        it('should calc proper MD5', function () {
            expect(etag).to.equal('6363f0d465541022f9b743c2f745b493');
        });
    });

    describe('#etagLookup (file not on S3)', function () {
        var etag,
            client = {},
            filePathToBackup = '',
            e = new events.EventEmitter;

        e.end = function () {};

        client.head = function () {
            return e;
        };

        beforeEach(function (done) {
            toS3.etagLookup(client, filePathToBackup, function (err, result) {
                etag = result;
                done();
            });

            var res = {
                headers: {
                    etag: undefined
                }
            };
            e.emit('response', res);
        });

        it('should return a non-null result (so searchStringInArray() does not explode)', function () {
            var NO_ETAG = 'files not found on S3 so no etag';
            expect(etag).to.equal(NO_ETAG);
        });
    });

    describe('#hashesAreTheSame', function () {
        it('should be true', function () {
            var md5 = 'abc',
                etag = '"abc"';
            expect(toS3.hashesAreTheSame(md5, etag)).to.equal(true);
        });
        it('should be false if etag does not include double quotes as part of the string', function () {
            var md5 = 'abc',
                etag = 'abc';
            expect(toS3.hashesAreTheSame(md5, etag)).to.equal(false);
        });
    });


    describe('#uploadFile', function () {
        var message,
            errMessage,
            client = {},
            filePathToBackup = '',
            e = new events.EventEmitter;

        // e.end = function () {};

        client.upload = function () {
            return e;
        };

        beforeEach(function (done) {
            toS3.uploadFile(client, filePathToBackup, function (err, result) {
                errMessage = err;
                message = result;
                done();
            });

            e.emit('end');
        });

        it('should trigger message when file upload finishes', function () {
            var SUCCESS_UPLOAD = 'file uploaded';
            expect(message).to.equal(SUCCESS_UPLOAD);
        });
    });

});


