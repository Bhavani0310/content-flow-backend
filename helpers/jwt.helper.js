const jwt = require("jsonwebtoken");
const generateUUID = require("./uuid.helper");

const jwtToken = require("../Models/jwt-token.model");

exports.signToken = async (payload) => {
    try {
        const generatedToken = jwt.sign(payload, process.env.jwtSecretKey);
        const token = await jwtToken.create({
            jwtTokenId: generateUUID(),
            token: generatedToken,
        });
        return token.jwtTokenId;
    } catch (error) {
        return error.message;
    }
};

exports.verifyToken = async (jwtTokenId) => {
    try {
        let token = null;
        const tokenResponse = await jwtToken.findOne({ jwtTokenId });
        if (tokenResponse) {
            token = tokenResponse.token;
        }
        return jwt.verify(token, process.env.jwtSecretKey);
    } catch (err) {
        return null;
    }
};