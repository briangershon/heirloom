// test/tos3.js

var chai = require("chai"),
    expect = chai.expect,
    chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);;

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
        it('should calc proper MD5', function (done) {
            var fileStream = new stream();
            
            var promise = toS3.md5Calc(fileStream);
            expect(promise).to.eventually.deep.equal({
                md5: '6363f0d465541022f9b743c2f745b493'
            }).and.notify(done);

            fileStream.emit('data', 'this is my string');
            fileStream.emit('end');
        });
    });

    describe('#etagLookup', function () {
        var etag,
            client = {},
            filePathToBackup = '',
            e = new events.EventEmitter;

        e.end = function () {};

        client.head = function () {
            return e;
        };

        it('should return an etag (if file exists)', function (done) {
            var res = {
                headers: {
                    etag: '6363f0d465541022f9b743c2f745b493'
                }
            };

            var promise = toS3.etagLookup(client, filePathToBackup);
            expect(promise).to.eventually.deep.equal({
                etag: '6363f0d465541022f9b743c2f745b493'
            }).and.notify(done);

            e.emit('response', res);
        });
        
        it('should return an empty etag (if file does not exist)', function (done) {
            var res = {
                headers: {
                    etag: undefined
                }
            };

            var promise = toS3.etagLookup(client, filePathToBackup);
            expect(promise).to.eventually.deep.equal({
                etag: ''
            }).and.notify(done);

            e.emit('response', res);
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


