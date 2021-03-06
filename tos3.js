// 'toS3' module

var ALREADY_EXISTS = 'file already exists on remote',
    SUCCESS_UPLOAD = 'file uploaded';

var s3 = require('s3'),
    knox = require('knox'),
    crypto = require('crypto'),
    Q = require('q'),
    path = require('path');

exports.upload = function (filePathToBackup, numberOfPathPartsToStrip, prependText, fileStream, awsBucket, awsAccessKey, awsSecretKey) {

    return exports.setInputOutputPaths(filePathToBackup, numberOfPathPartsToStrip, prependText)
    .then(function (results) {
        var inputPath = results.inputPath,
            outputPath = results.outputPath;

        console.log('About to upload ' + inputPath + ' to S3 as ' + outputPath);

        var client = knox.createClient({
            key: awsAccessKey,
            secret: awsSecretKey,
            bucket: awsBucket
        });
        
        return Q.all([
            exports.md5Calc(fileStream),
            exports.etagLookup(client, outputPath),
            Q({ inputPath: inputPath, outputPath: outputPath })
        ]);
    })
    .then(function (results) {
        /*
        
        returns promise.

        results = [ { md5: '095ccfae4084dc5133efb77efe851926' },
          { etag: '095ccfae4084dc5133efb77efe851926' }
          { inputPath: xxx, outputPath: yyy } ]

         */
        return exports.uploadIfNotAlreadyOnS3(results, awsAccessKey, awsSecretKey, awsBucket);
    })
    .then(function (results) {
        console.log(results);

        // // console.log("steps run: ", results);
        // if (searchStringInArray(ALREADY_EXISTS, results) > -1) {
        //     console.log('...skipping, already uploaded.');
        // }
        // if (searchStringInArray(SUCCESS_UPLOAD, results) > -1) {
        //     console.log('...uploaded successfully.');
        // }
        process.exit(0);
    })
    .catch(function (error) {
        console.log('CATCH ERROR > ', error);
        // console.log("steps run: ", results);
        process.exit(1);
    })
    .done();
};

exports.setInputOutputPaths = function (filepath, numberOfPathPartsToStrip, prependText) {
    newPath = exports.stripPath(filepath, numberOfPathPartsToStrip),
    inputPath = newPath.input,
    outputPath = newPath.output;

    if (prependText && typeof prependText === 'string' && prependText.length > 0) {
        outputPath = [prependText, outputPath].join('');
    }

    return Q({inputPath: inputPath, outputPath: outputPath});
};

exports.md5Calc = function (fileStream) {
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
};

exports.etagLookup = function (client, filePathToBackup) {
    // console.log('START remote etag head request');
    var deferred = Q.defer();
    client.head(exports.encodeURI(filePathToBackup))
    .on('response', function (res) {
        etag = res.headers.etag;
        if (typeof etag === 'string' && etag.length > 0) {
            
            // Strip of doublequote that knox Client.head() returns around the etag string
            etag = etag.replace(/"/g, '');
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
};

// http://stackoverflow.com/questions/18082/validate-numbers-in-javascript-isnumeric
function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

// returns an object with an input and output key
exports.stripPath = function (filePathToBackup, numberOfPathPartsToStrip) {
    var basename = path.basename(filePathToBackup),
        input = filePathToBackup,
        output;

    if (numberOfPathPartsToStrip && isNumber(numberOfPathPartsToStrip)) {
        var newPathArray = path.dirname(filePathToBackup).split(path.sep),
            slicedPathArray = newPathArray.slice(numberOfPathPartsToStrip + 1); // skip leading / in array
        slicedPathArray.unshift('');    // add back leading /
        output = slicedPathArray.join(path.sep) + path.sep + basename;
    } else {
        output = input;
    }

    // console.log(input, output);
    return { input: input, output: output };
};

exports.uploadFile = function (client, inputPath, outputPath) {
    var deferred = Q.defer(),
        uploader = client.upload(inputPath, encodeURI(outputPath));

    uploader.on('error', function (err) {
        // console.error("unable to upload:", err);
        deferred.reject(new Error('unable to upload ' + inputPath + ' due to ' + err));
    });
    uploader.on('progress', function (amountDone, amountTotal) {
        console.log("progress: ", Math.round(Number((amountDone/amountTotal) * 100)), "%");
        deferred.notify("progress: " + Math.round(Number((amountDone/amountTotal) * 100)) + "%");
        //process.stdout.write(''+Math.round(Number((amountDone/amountTotal) * 100))+', ');
    });
    uploader.on('end', function (url) {
        // console.log("file available at", url);
        deferred.resolve({message: SUCCESS_UPLOAD});
    });
    return deferred.promise;
};

exports.searchStringInArray = function (str, strArray) {
    for (var j=0; j<strArray.length; j++) {
        if (strArray[j].match(str)) return j;
    }
    return -1;
};

exports.encodeURI = function (path) {
    var newPath = path;
    if (path.charAt(0) === '/') {
        newPath = path.slice(1);
    }
    return encodeURIComponent(newPath);
};

exports.hashesAreTheSame = function (md5, etag) {
    if (md5 === etag) {
        return true;
    }
    return false;
};

exports.createS3Client = function (awsAccessKey, awsSecretKey, awsBucket) {
    return s3.createClient({
        key: awsAccessKey,
        secret: awsSecretKey,
        bucket: awsBucket
    });
};

exports.uploadIfNotAlreadyOnS3 = function (results, awsAccessKey, awsSecretKey, awsBucket) {
    var md5,
        etag,
        inputPath,
        outputPath;

    if (results && results.length === 3 && typeof results[0].md5 === 'string' && results[0].md5.length > 0) {
        md5 = results[0].md5;
        etag = results[1].etag;
        inputPath = results[2].inputPath;
        outputPath = results[2].outputPath;
        if (exports.hashesAreTheSame(md5, etag)) {
            return Q({message: 'file already uploaded'});
        } else {
            var client = exports.createS3Client(awsAccessKey, awsSecretKey, awsBucket);
            // upload a file to s3
            return exports.uploadFile(client, inputPath, outputPath);
        }
    } else {
        return Q.reject(new Error('results not expected'));
    }
};
