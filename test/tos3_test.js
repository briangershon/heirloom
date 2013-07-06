// test/tos3.js

var chai = require("chai"),
    expect = chai.expect,
    chaiAsPromised = require("chai-as-promised"),
    sinon = require("sinon");

chai.use(chaiAsPromised);;

var toS3 = require('../tos3'),
    stream = require('stream'),
    events = require('events'),
    Q = require('q');

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

        it('should return an etag (if file exists) (and strip double quotes wrapping etag which are added by knox)', function (done) {
            var res = {
                headers: {
                    etag: '"6363f0d465541022f9b743c2f745b493"'
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
        it('should be false with knox-added double quotes since quotes should have been stripped up the chain.', function () {
            var md5 = 'abc',
                etag = '"abc"';
            expect(toS3.hashesAreTheSame(md5, etag)).to.equal(false);
        });
        it('should be true if etag does not include double quotes as part of the string', function () {
            var md5 = 'abc',
                etag = 'abc';
            expect(toS3.hashesAreTheSame(md5, etag)).to.equal(true);
        });
        it('should be false if etag is an empty string', function () {
            var md5 = 'abc',
                etag = '';
            expect(toS3.hashesAreTheSame(md5, etag)).to.equal(false);
        });
    });


    describe('#uploadFile', function () {
        var message,
            errMessage,
            client = {},
            filePathToBackup = '',
            e = new events.EventEmitter;

        client.upload = function () {
            return e;
        };

        it('should trigger message when file upload finishes', function (done) {
            var SUCCESS_UPLOAD = 'file uploaded';
            
            var promise = toS3.uploadFile(client, filePathToBackup);
            expect(promise).to.eventually.deep.equal({
                message: SUCCESS_UPLOAD
            }).and.notify(done);

            e.emit('end');
        });

        it('should trigger error message if file not uploaded successfully', function (done) {
            var promise = toS3.uploadFile(client, filePathToBackup);
            expect(promise).to.be.rejected.with('unable to upload  due to some error').and.notify(done);
            e.emit('error', 'some error');
        });
        
    });
    
    describe('#uploadIfNotAlreadyOnS3', function () {
        describe('promise (rejected path)', function () {
            it('should reject if no MD5/ETAG array', function (done) {
                var arrayMD5AndEtag = undefined;
                var promise = toS3.uploadIfNotAlreadyOnS3(arrayMD5AndEtag);
                expect(promise).to.be.rejected.with('results not expected').and.notify(done);
            });

            it('should reject if empty array', function (done) {
                var arrayMD5AndEtag = [];
                var promise = toS3.uploadIfNotAlreadyOnS3(arrayMD5AndEtag);
                expect(promise).to.be.rejected.with('results not expected').and.notify(done);
            });

            it('should reject if missing ETAG parameter', function (done) {
                var arrayMD5AndEtag = [{etag:'xxx'}];
                var promise = toS3.uploadIfNotAlreadyOnS3(arrayMD5AndEtag);
                expect(promise).to.be.rejected.with('results not expected').and.notify(done);
            });

            it('should reject if missing MD5 parameter', function (done) {
                var arrayMD5AndEtag = [{md5:'xxx'}];
                var promise = toS3.uploadIfNotAlreadyOnS3(arrayMD5AndEtag);
                expect(promise).to.be.rejected.with('results not expected').and.notify(done);
            });

        });
        
        describe('promise (file already uploaded)', function () {
            it('should return message if file already uploaded', function (done) {
                var arrayMD5AndEtag = [{md5: 'xxx'}, {etag: 'xxx'}];
                var promise = toS3.uploadIfNotAlreadyOnS3(arrayMD5AndEtag);
                expect(promise).to.eventually.deep.equal({
                    message: 'file already uploaded'
                }).and.notify(done);
            });
        });

        describe('promise (should upload file)', function () {
            it('should upload file if md5 and etag are different', function (done) {
                var SUCCESS_UPLOAD = 'file uploaded',
                    awsAccessKey = '111',
                    awsSecretKey = '222',
                    awsBucket = '333',
                    filePathToBackup = '';

                var arrayMD5AndEtag = [{md5: 'xxx'}, {etag: 'yyy'}];
                
                sinon.stub(toS3, 'createS3Client').returns({});
                sinon.stub(toS3, 'uploadFile').returns(Q({message: SUCCESS_UPLOAD}));
                
                var promise = toS3.uploadIfNotAlreadyOnS3(arrayMD5AndEtag, awsAccessKey, awsSecretKey, awsBucket, filePathToBackup);
                
                expect(promise).to.eventually.deep.equal({
                    message: SUCCESS_UPLOAD
                }).and.notify(done);
            });
        });
    });

});


