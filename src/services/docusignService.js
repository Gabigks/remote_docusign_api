import docusign from 'docusign-esign';
import HTMLtoDOCX from 'html-to-docx';

export const getEnvelopesApi = (request) => {
  let dsApiClient = new docusign.ApiClient();
  dsApiClient.setBasePath(process.env.BASE_PATH);
  dsApiClient.addDefaultHeader(
    "Authorization",
    "Bearer " + request.session.access_token
  );
  return new docusign.EnvelopesApi(dsApiClient);
}

export const getTemplatesApi = (request) => {
  let dsApiClient = new docusign.ApiClient();
  dsApiClient.setBasePath(process.env.BASE_PATH);
  dsApiClient.addDefaultHeader(
    "Authorization",
    "Bearer " + request.session.access_token
  );
  return new docusign.TemplatesApi(dsApiClient);
}

export const makeTemplate = (req) => {

  const modifiedSigners = [];
  
  let { signers, envelopeTemp } = req.body;

  signers.forEach(signer => {
    const modifiedSigner = docusign.Signer.constructFromObject({
      roleName: signer.roleName,
      recipientId: signer.recipientId,
      routingOrder: signer.routingOrder,
    })
    modifiedSigners.push(modifiedSigner);
  });

  const signersArray = modifiedSigners.map(signer => signer);

  const recipients = docusign.Recipients.constructFromObject({
    signers: signersArray
  });

  console.log(modifiedSigners);
  console.log(recipients);

  // create the envelope template model
  const templateRequest = docusign.EnvelopeTemplate.constructFromObject({
    name: envelopeTemp.name,
    description: envelopeTemp.desc,
    emailSubject: envelopeTemp.emailSubject,
    shared: envelopeTemp.shared,
    recipients: recipients,
    status: "created",
  });
  return templateRequest;
}

export const templateDocument = async (req) => {
  try {
    const fileBuffer = await bufferHtml(req);

    // Create the document objects
    const document = docusign.Document.constructFromObject({
      documentBase64: Buffer.from(fileBuffer).toString('base64'),
      name: 'pastel.docx',
      fileExtension: 'docx',
      documentId: 1,
      order: 1,
    });

    const envelopeDefinition = docusign.EnvelopeDefinition.constructFromObject({
      documents: [document],
    });

    return envelopeDefinition;
  } catch (error) {
    console.error('Error creating or reading the document:', error);
    throw error; // Propagate the error
  }
}

export const recipientTabs = (anchor) => {
  const signHere = docusign.SignHere.constructFromObject({
    anchorString: anchor,
    anchorUnits: "pixels",
    anchorXOffset: "5",
    anchorYOffset: "-22",
  });

  const tabs = docusign.Tabs.constructFromObject({
    signHereTabs: [signHere],
  });

  return tabs;
};

export const makeEnvelope = (req, templateId) => {
  // create the signer model
  
  let { signers } = req.body;
  
  const modifiedSigners = [];

  signers.forEach(signer => {
    const modifiedSigner = docusign.TemplateRole.constructFromObject({
      email: signer.email,
      name: signer.name,
      roleName: signer.roleName,
    })
    modifiedSigners.push(modifiedSigner);
  });

  console.log(modifiedSigners);
  const templateRoles = modifiedSigners.map(modifiedSigner => modifiedSigner);

  // create the envelope model
  const envelopeDefinition = docusign.EnvelopeDefinition.constructFromObject({
    templateRoles: templateRoles,
    status: "created",
    templateId: templateId,
  });

  return envelopeDefinition;
};

export const formFields = (documentId, req) => {

  let { signers } = req.body;
  
  const modifiedSigners = [];

  signers.forEach(signer => {
    const modifiedSigner = docusign.TemplateRole.constructFromObject({
      email: signer.email,
      name: signer.name,
      roleName: signer.roleName,
    })
    modifiedSigners.push(modifiedSigner);
  });

  const docGenFormFieldRequest =
    docusign.DocGenFormFieldRequest.constructFromObject({
      docGenFormFields: [
        docusign.DocGenFormFields.constructFromObject({
          documentId: documentId,
          docGenFormFieldList: [
            docusign.DocGenFormField.constructFromObject({
              name: "Candidate_Name",
              value: modifiedSigners[0].name,
            }),
            docusign.DocGenFormField.constructFromObject({
              name: "Email",
              value: modifiedSigners[0].email,
            }),
            docusign.DocGenFormField.constructFromObject({
              name: "Company_Name",
              value: modifiedSigners[0].company,
            }),
          ],
        }),
      ],
    });

  return docGenFormFieldRequest;
}

const bufferHtml = async (req) => {
  const htmlString = req.body.html;

  const fileBuffer = await HTMLtoDOCX(htmlString, null, {
    table: { row: { cantSplit: true } },
    footer: true,
    pageNumber: true,
  });

  return fileBuffer;
}



