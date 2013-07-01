// 'toS3' module

var ALREADY_EXISTS = 'file already exists on remote',
    SUCCESS_UPLOAD = 'file uploaded',
    ERROR_STOP = 'an error occurred',
    NO_ETAG = 'files not found on S3 so no etag';

var s3 = require('s3'),
    knox = require('knox'),
    crypto = require('crypto'),
    async = require('async');

// TODO: Remove these global variables and use async.waterfall and pass them as parameters to next step
var md5, etag;

function upload (filePathToBackup, fileStream, awsBucket, awsAccessKey, awsSecretKey) {

    console.log('Processing ' + filePathToBackup);

    async.series([
        function (callback) {
            md5Calc(fileStream, callback);
        }, 

        function (callback) {
            var client = knox.createClient({
                key: awsAccessKey,
                secret: awsSecretKey,
                bucket: awsBucket
            });
            etagLookup(client, filePathToBackup, callback);
        },

        function (callback) {
            // console.log('START uploader... md5 is ', md5, ' etag is ', etag);
            // TODO: Unit test path if hashes are NOT the same
            if (hashesAreTheSame(md5, etag)) {
                //file already uploaded
                callback(null, ALREADY_EXISTS);
                return;
            }

            var client = s3.createClient({
                key: awsAccessKey,
                secret: awsSecretKey,
                bucket: awsBucket
            });

            // upload a file to s3
            uploadFile(client, filePathToBackup, callback);
        }],
        function (err, results) {
            if (err) {
                console.log("error: ", err);
                console.log("steps run: ", results);
                process.exit(1);
            }
            // console.log("steps run: ", results);
            if (searchStringInArray(ALREADY_EXISTS, results) > -1) {
                console.log('...skipping, already uploaded.');
            }
            if (searchStringInArray(SUCCESS_UPLOAD, results) > -1) {
                console.log('...uploaded successfully.');
            }
            process.exit(0);
        }
    );
}

function md5Calc (fileStream, callback) {
    // console.log('START md5 calc');
    var md5sum = crypto.createHash('md5');
    var s = fileStream;
    s.on('data', function (d) {
        md5sum.update(d);
    });
    s.on('end', function () {
        md5 = md5sum.digest('hex');
        callback(null, md5);
    });
}

function etagLookup (client, filePathToBackup, callback) {
    // console.log('START remote etag head request');
    client.head(encodeURI(filePathToBackup))
    .on('response', function (res) {
        etag = res.headers.etag;
        if (etag) {
            callback(null, etag);
        } else {
            callback(null, NO_ETAG);
        }
    })
    .on('error', function (err) {
        callback("When checking remote file's etag, this error occurred: " + err + ". Not connected to internet?", ERROR_STOP);
    })
    .end();
}

function uploadFile (client, filePathToBackup, callback) {
    var uploader = client.upload(filePathToBackup, encodeURI(filePathToBackup));
    uploader.on('error', function (err) {
        console.error("unable to upload:", err.stack);
        callback('unable to uplaod ' + filePathToBackup + ' due to ' + err.stack, ERROR_STOP);
    });
    uploader.on('progress', function (amountDone, amountTotal) {
        console.log("progress: ", Math.round(Number((amountDone/amountTotal) * 100)), "%");
        //process.stdout.write(''+Math.round(Number((amountDone/amountTotal) * 100))+', ');
    });
    uploader.on('end', function (url) {
        // console.log("file available at", url);
        callback(null, SUCCESS_UPLOAD);
    });
}

function searchStringInArray (str, strArray) {
    for (var j=0; j<strArray.length; j++) {
        if (strArray[j].match(str)) return j;
    }
    return -1;
}

function encodeURI (path) {
    var newPath = path;
    if (path.charAt(0) === '/') {
        newPath = path.slice(1);
    }
    return encodeURIComponent(newPath);
}

function hashesAreTheSame (md5, etag) {
    // NOTE: knox Client.head() returns etag as a string that contains beginning/end double quotes
    if ('"' + md5 + '"' === etag) {
        return true;
    }
    return false;
}

// main exports
exports.upload = upload;

//helper functions exported for testing
exports.encodeURI = encodeURI;
exports.searchStringInArray = searchStringInArray;
exports.md5Calc = md5Calc;
exports.etagLookup = etagLookup;
exports.hashesAreTheSame = hashesAreTheSame;
exports.uploadFile = uploadFile;