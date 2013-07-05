// 'toS3' module

var ALREADY_EXISTS = 'file already exists on remote',
    SUCCESS_UPLOAD = 'file uploaded',
    ERROR_STOP = 'an error occurred';

var s3 = require('s3'),
    knox = require('knox'),
    crypto = require('crypto'),
    Q = require('q');

// TODO: Remove these global variables and use async.waterfall and pass them as parameters to next step
var md5, etag;

function upload (filePathToBackup, fileStream, awsBucket, awsAccessKey, awsSecretKey) {

    return start(filePathToBackup)
    .then(function (filePathToBackup) {
        console.log('Processing ' + filePathToBackup);
        return md5Calc(fileStream);
    })
    .then(function (results) {
        console.log(results);
        var client = knox.createClient({
            key: awsAccessKey,
            secret: awsSecretKey,
            bucket: awsBucket
        });
        return etagLookup(client, filePathToBackup);
    })
    .then(function (results) {
        console.log(results);   // should have etag parameter
        
        // TODO: Move these first two steps into a Q.all() so they both need to complete
        //  to get results and compare the two to see if next step should happen.
        
/*
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
        return uploadFile(client, filePathToBackup, callback);
*/
    })
    // .then(function () {
    //     // console.log("steps run: ", results);
    //     if (searchStringInArray(ALREADY_EXISTS, results) > -1) {
    //         console.log('...skipping, already uploaded.');
    //     }
    //     if (searchStringInArray(SUCCESS_UPLOAD, results) > -1) {
    //         console.log('...uploaded successfully.');
    //     }
    //     process.exit(0);
    // })
    .catch(function (error) {
        console.log('CATCH ERROR > ', error);
        // console.log("steps run: ", results);
        process.exit(1);
    })
    .done();
}

function start (filepath) {
    return Q.fcall(function () {
        return filepath;
    });
};

function md5Calc (fileStream) {
    // console.log('START md5 calc');
    var deferred = Q.defer();
    var md5sum = crypto.createHash('md5');
    var s = fileStream;
    s.on('data', function (d) {
        md5sum.update(d);
    });
    s.on('error', function (e) {
        deferred.reject(new Error(e));
    });
    s.on('end', function () {
        md5 = md5sum.digest('hex');
        deferred.resolve({md5: md5});
    });
    return deferred.promise;
}

function etagLookup (client, filePathToBackup, callback) {
    // console.log('START remote etag head request');
    var deferred = Q.defer();
    client.head(encodeURI(filePathToBackup))
    .on('response', function (res) {
        etag = res.headers.etag;
        if (etag) {
            deferred.resolve({etag: etag});
        } else {
            deferred.resolve({etag: ''});
        }
    })
    .on('error', function (err) {
        deferred.reject(new Error("When checking remote file's etag, this error occurred: " + err + ". Not connected to internet?"));
    })
    .end();
    
    return deferred.promise;
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