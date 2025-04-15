const CommonConstant = require("../constants/common.constant");
const getTokenfromCookie = (cookies) => {
    console.log("cookies are:",cookies);
    const getToken = cookies?.split(";")
        .find((cookie) =>
            cookie.trim().startsWith(CommonConstant.signatureCookieName),
        );
    return getToken ? getToken.split("=")[1] : null;
};

module.exports = getTokenfromCookie;