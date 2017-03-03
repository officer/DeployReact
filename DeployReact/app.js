// Initialize clients
var async = require('async');
var AWS = require('aws-sdk');
var s3_client = new AWS.S3({
    region:     process.env.REGION,
    maxRetries: process.env.MAX_RETRIES
});


// Mime-type dictionary
MIME_TYPE = {
    // text
    "htm":  "text/html",
    "html": "text/html",
    "css": "text/css",

    // image
    "ico":  "image/x-icon",
    "jpeg": "image/jpeg",
    "jpg": "image/jpeg",
    "png": "image/png",
    "svg": "image/svg+xml",

    // application
    "js":   "application/js",
    "json": "application/json",
    "ttf":  "application/x-font-ttf"
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
        moveObject(data.s3.bucket.name, data.s3.object.key, function (err, result) {
            if (err) {
                console.log("Failed to MoveObject for Bucket:" + data.s3.bucket.name + ", Key:" + data.s3.object.key);
            } else {
                console.log("Successful MoveObject for Bucket:" + data.s3.bucket.name + ", Key:" + data.s3.object.key);
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
            console.log("Deployed " + results.length + " objects");

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

    var extention = getExtention(key);

    if (extention == "map") next(null, "pass :" + key);

    s3_client.getObject(getObjectParam, function (err, data) {
        if (err) {
            console.log("Failed to GetObject for Bucket:" + bucket + ", Key:" + key);
            console.log(JSON.stringify(err));
            callback(err, null);
            next(err, null);
        } else {
            console.log("Successful GetObject for Bucket:" + bucket + ", Key:" + key);

            var contentType = decideMimeType(key);
            key = eliminatePrefix(key);

            if (contentType) {
                console.log(key + "'s extentions will be eliminated");
                key = eliminateGZExtentions(key);
                console.log(key + " is modified result");
            }

            var puttObjectParam = {
                Bucket: process.env.DESTINATION_BUCKET,
                Key: key,
                Body: data.Body,
                ContentEncoding: "gzip",
                ContentType: contentType
            };
            console.log(key + " will be put with the following param");
            console.log(JSON.stringify(puttObjectParam));
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
    var extention = getExtention(key);
    console.log(key + "'s extension is " + extention);
    if (extention && MIME_TYPE[extention]) {
        console.log(extention + " is regarded as " + MIME_TYPE[extention]);
        return MIME_TYPE[extention];
    } else {
        return null;
    }
};


function getExtention(key) {
    var splitedKey = key.split("/");
    var filename = splitedKey[splitedKey.length - 1];

    var splitedString = filename.split(".");
    return splitedString[splitedString.length - 2];
};


function eliminateGZExtentions(key) {
    var filenameArray = key.split(".");
    return filenameArray.slice(0, filenameArray.length - 1).join(".");
};

function eliminatePrefix(key) {
    return key.replace(process.env.PREFIX, "");
};