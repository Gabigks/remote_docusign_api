const { request, response } = require("express");
const express = require("express");
const path = require("path")
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const docusign = require("docusign-esign");
const fs = require("fs-extra");
const session = require("express-session");

dotenv.config();

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: "ll493843fb712",
  resave: true,
  saveUninitialized: true
}));

app.post("/form", async (request, response) => {
  await checkToken(request);
  let envelopesApi = getEnvelopesApi(request);
  let templatesApi = getTemplatesApi(request);

  const templateData = makeTemplate();
  const template = await templatesApi.createTemplate(process.env.ACCOUNT_ID, { envelopeTemplate: templateData });
  const templateId = template.templateId

  const documentData = templateDocument();
  const documentId = '1';
  await templatesApi.updateDocument(process.env.ACCOUNT_ID, templateId, documentId, { envelopeDefinition: documentData });

  const tabs = recipientTabs();
  const recipientId = '1';
  await templatesApi.createTabs(process.env.ACCOUNT_ID, templateId, recipientId, { templateTabs: tabs });

  const envelopeData = makeEnvelope(request.body.name, request.body.email, request.body.company, templateId);
  const envelope = await envelopesApi.createEnvelope(process.env.ACCOUNT_ID, { envelopeDefinition: envelopeData });
  const envelopeId = envelope.envelopeId;

  const docGenFormFieldsResponse = await envelopesApi.getEnvelopeDocGenFormFields(process.env.ACCOUNT_ID, envelopeId);
  const documentIdGuid = docGenFormFieldsResponse.docGenFormFields[0].documentId;

  const formFieldsData = formFields(documentIdGuid, request.body.name, request.body.email, request.body.company);
  await envelopesApi.updateEnvelopeDocGenFormFields(process.env.ACCOUNT_ID, envelopeId, { docGenFormFieldRequest: formFieldsData });

  // response.redirect(results.url);

  const sendEnvelopeReq = docusign.Envelope.constructFromObject({
    status: 'sent',
  });
  return await envelopesApi.update(process.env.ACCOUNT_ID, envelopeId, { envelope: sendEnvelopeReq })
});

function formFields(documentId, name, email, company) {
  const docGenFormFieldRequest = docusign.DocGenFormFieldRequest.constructFromObject({
    docGenFormFields: [
      docusign.DocGenFormFields.constructFromObject({
        documentId: documentId,
        docGenFormFieldList: [
          docusign.DocGenFormField.constructFromObject({
            name: 'Candidate_Name',
            value: name
          }),
          docusign.DocGenFormField.constructFromObject({
            name: 'Email',
            value: email
          }),
          docusign.DocGenFormField.constructFromObject({
            name: 'Company_Name',
            value: company
          }),
        ]
      })
    ]
  });

  return docGenFormFieldRequest;
};

const makeEnvelope = (name, email, company, templateId) => {
  // create the signer model
  const signer = docusign.TemplateRole.constructFromObject({
    email: email,
    name: name,
    roleName: "signer"
  });

  // create the envelope model
  const envelopeDefinition = docusign.EnvelopeDefinition.constructFromObject({
    templateRoles: [signer],
    status: "created",
    templateId: templateId
  });
  return envelopeDefinition;
};

function recipientTabs() {
  const signHere = docusign.SignHere.constructFromObject({
    anchorString: "Employee Signature",
    anchorUnits: 'pixels',
    anchorXOffset: '5',
    anchorYOffset: '-22'
  });

  const tabs = docusign.Tabs.constructFromObject({
    signHereTabs: [signHere]
  });

  return tabs;
};


function templateDocument() {
  // read file
  const docBytes = fs.readFileSync(path.join(__dirname, "template_doc_docusign_api2.docx"));
  
  // create the document object
  const document = docusign.Document.constructFromObject({
    documentBase64: Buffer.from(docBytes).toString('base64'),
    name: 'template_doc_docusign_api2.docx',
    fileExtension: 'docx',
    documentId: 1,
    order: 1,
    pages: 1,
  });
  const envelopeDefinition = docusign.EnvelopeDefinition.constructFromObject({
    documents: [document],
  });
  return envelopeDefinition
};


function makeTemplate() {
  const signer = docusign.Signer.constructFromObject({
    roleName: "signer",
    recipientId: "1",
    routingOrder: "1",
  });

  const recipients = docusign.Recipients.constructFromObject({
    signers: [signer]
  });
  // create the envelope template model
  const templateRequest = docusign.EnvelopeTemplate.constructFromObject({
    name: "Example document generation template",
    description: "Example template created via the API",
    emailSubject: "Please sign this document",
    shared: "false",
    recipients: recipients,
    status: "created"
  });
  return templateRequest;
};

function getEnvelopesApi(request) {
  let dsApiClient = new docusign.ApiClient();
  dsApiClient.setBasePath(process.env.BASE_PATH);
  dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + request.session.access_token);
  return new docusign.EnvelopesApi(dsApiClient);
}

function getTemplatesApi(request) {
  let dsApiClient = new docusign.ApiClient();
  dsApiClient.setBasePath(process.env.BASE_PATH);
  dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + request.session.access_token);
  return new docusign.TemplatesApi(dsApiClient);
}

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








