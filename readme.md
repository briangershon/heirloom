# heirloom nodejs module

Useful for efficiently backing up your family photo collection (or any files).

Backup a file to S3, but only if it has changed or has not been uploaded before.

## Status of build

[![Build Status](https://travis-ci.org/briangershon/heirloom.png?branch=master)](https://travis-ci.org/briangershon/heirloom)

## Getting Started

        # install as a command-line tool
        npm install -g heirloom
        
        # setup these two AWS authentication keys in your environment:

        AWS_SECRET_ACCESS_KEY
        AWS_ACCESS_KEY_ID

## Usage

### Copy one file to 'mybucketname' on S3. On S3 the file is saved using the full path in its name

        $ heirloom --bucket myS3bucketname --input /Users/brian/Pictures/CA_1920x1080_05.jpg

### Copy one file to 'mybucketname' on S3 but strip off 2 levels of the path.

        # save to S3 as /Pictures/CA_1920x1080_05.jpg
        $ heirloom --bucket myS3bucketname --input /Users/brian/Pictures/CA_1920x1080_05.jpg --strip 2

### Copy one file to 'mybucketname' on S3 but strip off 2 levels of the path, plus prepend a new root path

        # save to S3 as /SomewhereElse/Pictures/CA_1920x1080_05.jpg
        $ heirloom --bucket myS3bucketname --input /Users/brian/Pictures/CA_1920x1080_05.jpg --strip 2 --prepend '/SomewhereElse'

### Want to copy all your .jpg images in your Pictures folder?

Just use unix "find" command and pipe to heirloom

Find *.jpg (case insensitive)

        $ find /Users/brian/Pictures -iname "*.jpg" -exec heirloom --bucket myS3bucketname --input \{\} \;

Find by multiple extensions (case insensitive)

        # IN THEORY THIS SHOULD WORK BUT DOES NOT. ONLY FINDING *.png FILES AND NO OTHERS. NOT SURE WHY.
        # SO INSTEAD I RUN A BASH SCRIPT THAT RUNS THIS COMMAND SEPARATELY FOR EACH EXTENSION.
        $ find /Users/brian/Pictures -iname "*.jpg" -o -iname "*.mov" -o -iname "*.jpeg" -o -iname "*.gif" -o -iname "*.png" -exec heirloom --bucket myS3bucketname --input \{\} \;

Find all files in the folder

        $ find /Users/brian/Pictures -exec heirloom --bucket myS3bucketname --input \{\} \;
        
Note that you should use an absolute path for "find" so that it includes an absolute path in the results.

The filename and path are used for the full name on S3.
        
