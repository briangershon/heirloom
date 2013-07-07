#!/usr/bin/env node

var toS3 = require('./tos3'),
    fs = require('fs');
    
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
    .options('s', {
        alias : 'strip'
    })
    .describe('s', 'Strip out first n segments of the path when creating output path on S3')
    .demand(['i', 'b'])
    .argv
;

var filePathToBackup = argv.i,
    awsAccessKey = process.env.AWS_ACCESS_KEY_ID,
    awsSecretKey = process.env.AWS_SECRET_ACCESS_KEY,
    awsBucket = argv.b,
    numberOfPathPartsToStrip = argv.s;
    
if (!awsAccessKey || !awsSecretKey) {
    console.log('Missing AWS Credentails.  You need two environment variables defined: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
    process.exit(1);
}

toS3.upload(filePathToBackup, numberOfPathPartsToStrip, fs.ReadStream(filePathToBackup), awsBucket, awsAccessKey, awsSecretKey);