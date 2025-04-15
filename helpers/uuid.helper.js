const uuid = require("uuid").v4;

const generateUUID = () => {
    const generatedUUID = uuid();
    return generatedUUID.replace(/-/g, "");
};

module.exports = generateUUID;