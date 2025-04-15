require("dotenv").config();

const connectDatabase = require("./config/mongodb");
const app = require("./app");

const PORT = process.env.PORT || 4000;

connectDatabase()
    .then(() => {
        app.on("error", (error) => {
            console.log("Error!! ", error);
            throw error;
        });
        app.listen(PORT, () => {
            console.log(
                `⚡️[server]: Server is running at http://localhost:${PORT} - ${new Date().toDateString()} / ${new Date().toLocaleTimeString()}`,
            );
        });
    })
    .catch((error) => {
        console.log("MongoDB Connection Failed !!! ", error);
    });