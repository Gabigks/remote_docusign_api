const fs = require("fs-extra");
const docusign = require("docusign-esign");
const path = require("path");

async function checkToken(request) {
    if (request.session.access_token && Date.now() < request.session.expires_at) {
      console.log("re-using acess_token", request.session.access_token);
    } else {
      console.log("generating new acess_token");
      let dsApiClient = new docusign.ApiClient();
      dsApiClient.setBasePath(process.env.BASE_PATH);
      const results = await dsApiClient.requestJWTUserToken(
        process.env.INTEGRATION_KEY,
        process.env.USER_ID,
        "signature",
        fs.readFileSync(path.join(__dirname, "..\\private_key")),
        3600
      );
      console.log(results.body);
      request.session.access_token = results.body.access_token;
      request.session.expires_at = Date.now() + (results.body.expires_in - 60) * 1000
    }
  }

module.exports = {
    checkToken: checkToken
};