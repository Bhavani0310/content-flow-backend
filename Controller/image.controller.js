const { s3Client } = require("../config/awss3");

// Function to upload an image to S3
exports.uploadImageToS3 = async (fileName, file,userId) => {
    try {
        console.log("file",file)
        const uploadParams = {
            Bucket: process.env.S3_BUCKET_NAME,
            Body: file.buffer,
            Key: `profile-images/${userId}-${Date.now()}-${fileName}`,
            ContentType: file.mimetype,
            ACL: 'public-read'
        };

        const result=await s3Client.upload(uploadParams).promise();
        console.log(result)
        return result.Location;
       // return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/profile-images/${userId}-${Date.now()}-${fileName}`;
    } catch (error) {
        console.error("Error uploading image to S3:", error);
        return null;
    }
};

exports.removeImageFromS3 = async (fileName) => {
    try {
        const deleteParams = {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: fileName,
        };

        await s3Client.deleteObject(deleteParams).promise();
        return true; 
    } catch (error) {
        console.error("Error removing image from S3:", error);
        return false; 
    }
};

//upload video to s3
exports.uploadVideoToS3 = async (fileName, file, taskId) => {
    try {
        const uploadParams = {
            Bucket: process.env.S3_BUCKET_NAME,
            Body: file.buffer,
            Key: `videos/${taskId}-${Date.now()}-${fileName}`,
            ContentType: file.mimetype,
            ACL: 'public-read'
        };

        const result = await s3Client.upload(uploadParams).promise();
        return result.Location; // Return the S3 URL
    } catch (error) {
        console.error("Error uploading video to S3:", error);
        return null;
    }
};
