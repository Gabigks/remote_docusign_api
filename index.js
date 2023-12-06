const { request, response } = require("express");
const express = require("express");
const path = require("path")
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const docusign = require("docusign-esign");
const fs = require("fs");
const session = require("express-session")

dotenv.config();

const app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.use(session({
    secret: "ll493843fb712",
    resave: true,
    saveUninitialized: true
}));

app.post("/form", async (request, response) => {
    await checkToken(request);
    let envelopesApi = getEnvelopesApi(request);
        
    // Make the envelope request body
    let envelope = makeEnvelope(request.body.name, request.body.email, request.body.company);
    
    // Call Envelopes::create API method
    // Exceptions will be caught by the calling function
    let results = await envelopesApi.createEnvelope(
        process.env.ACCOUNT_ID, {envelopeDefinition: envelope}
    );
    console.log("envelope results ", results);

    let viewRequest = makeRecipientViewRequest(request.body.name, request.body.email);
    // Call the CreateRecipientView API
    // Exceptions will be caught by the calling function
    results = await envelopesApi.createRecipientView(
        process.env.ACCOUNT_ID, 
        results.envelopeId, {
    recipientViewRequest: viewRequest,
    });

    response.redirect(results.url);
});

function makeEnvelope(name, email, company){
    // Create the envelope definition
    let env = new docusign.EnvelopeDefinition();
    env.templateId = process.env.TEMPLATE_ID;

    let text = docusign.Text.constructFromObject({
        tabLabel: 'company_name',
        value: company,
    });
    // Pull together the existing and new tabs in a Tabs object:
    let tabs = docusign.Tabs.constructFromObject({
        textTabs: [text]
    });
    
    // Create template role elements to connect the signer and cc recipients
    // to the template
    // We're setting the parameters via the object creation
    let signer1 = docusign.TemplateRole.constructFromObject({
        email: email,
        name: name,
        tabs: tabs,
        clientUserId: process.env.CLIENT_USER_ID,
        roleName: 'Applicant'
    });
    
    // Add the TemplateRole objects to the envelope object
    env.templateRoles = [signer1];
    env.status = "sent"; // We want the envelope to be sent
    
    return env;
}

function makeRecipientViewRequest(name, email){
    let viewRequest = new docusign.RecipientViewRequest();

    viewRequest.returnUrl = "http://localhost:8000/success";
    viewRequest.authenticationMethod = 'none';

    viewRequest.email = email;
    viewRequest.userName = name; 
    viewRequest.clientUserId = process.env.CLIENT_USER_ID;

    return viewRequest;
}

function getEnvelopesApi(request){
    let dsApiClient = new docusign.ApiClient();
    dsApiClient.setBasePath(process.env.BASE_PATH);
    dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + request.session.access_token);
    return new docusign.EnvelopesApi(dsApiClient);
}

async function checkToken(request){
    if(request.session.access_token && Date.now() < request.session.expires_at){
        console.log("re-using acess_token", request.session.access_token);
    }else {
        console.log("generating new acess_token");
        let dsApiClient = new docusign.ApiClient();
        dsApiClient.setBasePath(process.env.BASE_PATH);
        const results = await dsApiClient.requestJWTUserToken(
            process.env.INTEGRATION_KEY, 
            process.env.USER_ID, 
            "signature", 
            fs.readFileSync(path.join(__dirname, "private_key")), 
            3600
        );
        console.log(results.body);
        request.session.access_token = results.body.access_token;
        request.session.expires_at = Date.now() + (results.body.expires_in - 60) * 1000
    }
}

app.get("/", async (request, response) => {
    await checkToken(request);
    response.sendFile(path.join(__dirname, "main.html"));
});

app.get("/success", (request, response) => {
    response.send("Sucess");
});

app.listen(8000, () => {
    console.log("Server has started!", process.env.USER_ID);
})

//https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=c9e816b7-a3be-402e-89b0-edcc0f21b492&redirect_uri=http://localhost:8000/