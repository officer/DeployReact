// Initialize clients
var async = require('async');
var AWS = require('aws-sdk');
var s3_client = new AWS.S3({
    region:     process.env.REGION,
    maxRetries: process.env.MAX_RETRIES
});


// Mime-type dictionary
MIME_TYPE = {
    "htm": "text/html",
    "html": "text/html",
    "css": "text/css",
    "ico": "image/x-icon",
    "jpeg": "image/jpeg",
    "jpg": "image/jpeg",
    "js": "application/js",
    "json": "application/json",
    "ttf": "application/x-font-ttf",
    "png": "image/png"
};

console.log('Loading');

exports.handler = function (event, context) {

    if (event != null) {
        console.log('event = ' + JSON.stringify(event));
    }
    else {
        console.log('No event object');
    }

    async.map(event.Records, function (data, next) {
        moveObject(data.s3.bucket.name, data.s3.object.key, function (err, data) {
            if (err) {
                console.log("Failed to MoveObject for Bucket:" + bucket + ", Key:" + key);
            } else {
                console.log("Successful MoveObject for Bucket:" + bucket + ", Key:" + key);
            }
        }, next);
    }, function (err, results) {
        if (err) {
            console.log("Failed to deploy");
            console.log(JSON.stringify(err));

            // Failure
            context.done(err, null);
        } else {
            console.log("Successfully deployment");
            consolo.log("Deployed " + results.length + " objects");

            // SUCCESS
            context.done(null, results);
        }
    });

};


function moveObject(bucket, key, callback, next) {
    var getObjectParam = {
        Bucket: bucket,
        Key:    key
    };
    s3_client.getObject(getObjectParam, function (err, data) {
        if (err) {
            console.log("Failed to GetObject for Bucket:" + bucket + ", Key:" + key);
            console.log(JSON.stringify(err));
            callback(err, null);
            next(err, null);
        } else {
            console.log("Successful GetObject for Bucket:" + bucket + ", Key:" + key);

            var contentType = decideMimeType(key);

            var puttObjectParam = {
                Bucket: process.env.DESTINATION_BUCKET,
                Key: key,
                Body: data.Body,
                ContentEncoding: "gzip",
                ContentType: contentType
            };
            s3_client.putObject(puttObjectParam, function (err, data) {
                if (err) {
                    console.log("Failed to PutObject for Bucket:" + bucket + ", Key:" + key);
                    console.log(JSON.stringify(err));
                    callback(err, null);
                    next(err, null);
                } else {
                    console.log("Successful PutObject for Bucket:" + bucket + ", Key:" + key);
                    callback(null, data);
                    next(null, data);
                }
            });
        }

    });
};

function decideMimeType(key) {
    var splitedKey = key.split("/");
    var filename = splitedKey[splitedKey.length - 1];

    var splitedString = filename.split(".");
    if (!splitedString[splitedString.length - 2] && !MIME_TYPE[splitedString[splitedString.length - 2]]) {
        return MIME_TYPE[splitedString[splitedString.length - 2]];
    } else {
        return null;
    }
};