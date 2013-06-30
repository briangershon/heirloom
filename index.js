#!/usr/bin/env node

var ALREADY_EXISTS = 'file already exists on remote',
    SUCCESS_UPLOAD = 'file uploaded',
    ERROR_STOP = 'an error occurred';

var s3 = require('s3'),
    knox = require('knox'),
    crypto = require('crypto'),
    fs = require('fs'),
    async = require('async');
    
var argv = require('optimist')
    .usage('Backup your family photos (or any file) efficiently to Amazon S3')
    .options('i', {
        alias : 'input'
    })
    .describe('i', 'Filename (with path) for file to upload')
    .options('b', {
        alias : 'bucket'
    })
    .describe('b', 'AWS Bucket Name')
    .demand(['i', 'b'])
    .argv
;

var md5, etag;

var filePathToBackup = argv.i,
    awsAccessKey = process.env.AWS_ACCESS_KEY_ID,
    awsSecretKey = process.env.AWS_SECRET_ACCESS_KEY,
    awsBucket = argv.b;
    
if (!awsAccessKey || !awsSecretKey) {
    console.log('Missing AWS Credentails.  You need two environment variables defined: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
    process.exit(1);
}

console.log('Processing ' + filePathToBackup);

async.series([
    function(callback) {
        //console.log('START md5 calc');
        var md5sum = crypto.createHash('md5');
        var s = fs.ReadStream(filePathToBackup);
        s.on('data', function(d) {
            md5sum.update(d);
        });
        s.on('end', function() {
            md5 = md5sum.digest('hex');
            //console.log('local file md5: ' + md5);
            callback(null, 'local md5 calc');
        });
    }, 
    
    function(callback) {
        // console.log('START remote etag head request');
        var client = knox.createClient({
            key: awsAccessKey,
            secret: awsSecretKey,
            bucket: awsBucket
        });
        client.head(encodeURI(filePathToBackup)).on('response', function(res) {
            // console.log("etag", res.headers.etag);
            etag = res.headers.etag;
            callback(null, 'remote etag head request');
        }).on('error', function (err) {
            callback("When checking remote file's etag, this error occurred: " + err + ". Not connected to internet?", ERROR_STOP);
        }).end();
    },
    
    function(callback) {
        // console.log('START uploader');
        if ('"' + md5 + '"' === etag) {
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
        var uploader = client.upload(filePathToBackup, encodeURI(filePathToBackup));
        uploader.on('error', function(err) {
            console.error("unable to upload:", err.stack);
            callback('unable to uplaod ' + filePathToBackup + ' due to ' + err.stack, ERROR_STOP);
        });
        uploader.on('progress', function(amountDone, amountTotal) {
            console.log("progress: ", Math.round(Number((amountDone/amountTotal) * 100)), "%");
            //process.stdout.write(''+Math.round(Number((amountDone/amountTotal) * 100))+', ');
        });
        uploader.on('end', function(url) {
            console.log("file available at", url);
            callback(null, SUCCESS_UPLOAD);
        });
    }],
    function(err, results) {
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