# heirloom nodejs module

Useful for efficiently backing up your family photo collection (or any files).

Backup a file to S3, but only if it has changed or has not been uploaded before.

## Getting Started

        # install as a command-line tool
        npm install -g heirloom
        
        # setup these two AWS authentication keys in your environment:

        AWS_SECRET_ACCESS_KEY
        AWS_ACCESS_KEY_ID

## Usage

### Copy one file to 'mybucketname' on S3. On S3 the file is saved using the full path in its name

        $ heirloom --bucket myS3bucketname --input /Users/brian/Pictures/CA_1920x1080_05.jpg

### Want to copy all your .jpg images in your Pictures folder?

Just use unix "find" command and pipe to heirloom

        $ find /Users/brian/Pictures -name "*.jpg" -exec heirloom --bucket myS3bucketname --input \{\} \;
        
Note that you should use an absolute path for "find" so that it includes an absolute path in the results.

The filename and path is used for the full name on S3.
        
