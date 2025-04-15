const mongoose = require("mongoose");

const connectDatabase = async () => {
    try {
        const connectionInstance = await mongoose.connect(
            `${process.env.DATABSE_URL}`,
        );
        console.log(
            `MongoDB Connected !! DB HOST: ${connectionInstance.connection.host}`,
        );
    } catch (error) {
        console.log("MongoDB Connection Error: ", error);
        process.exit(1);
    }
};

module.exports = connectDatabase;