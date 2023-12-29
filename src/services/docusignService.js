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
  
  let { signers } = req.body;

  signers.forEach(signer => {
    const modifiedSigner = docusign.Signer.constructFromObject({
      roleName: signer.roleName,
      recipientId: signer.recipientId,
      routingOrder: signer.routingOrder,
    })
    modifiedSigners.push(modifiedSigner);
  });
  
  // const signer = docusign.Signer.constructFromObject({
  //   roleName: "signer",
  //   recipientId: "1",
  //   routingOrder: "1",
  // });

  const recipients = docusign.Recipients.constructFromObject({
    signers: modifiedSigners.map(signer => {
      return signer;
    }),
  });

  console.log(modifiedSigners);
  console.log(recipients);

  // create the envelope template model
  const templateRequest = docusign.EnvelopeTemplate.constructFromObject({
    name: "Example document generation template",
    description: "Example template created via the API",
    emailSubject: "Please sign this document",
    shared: "false",
    recipients: recipients,
    status: "created",
  });
  return templateRequest;
}

export const templateDocument = async () => {
  try {
    const fileBuffer = await bufferHtml();

    // Create the document objects
    const document = docusign.Document.constructFromObject({
      documentBase64: Buffer.from(fileBuffer).toString('base64'),
      name: 'pastel.docx',
      fileExtension: 'docx',
      documentId: 1,
      order: 1,
      pages: 1,
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

export const recipientTabs = () => {
  const signHere = docusign.SignHere.constructFromObject({
    anchorString: "Employee Signature",
    anchorUnits: "pixels",
    anchorXOffset: "5",
    anchorYOffset: "-22",
  });

  const tabs = docusign.Tabs.constructFromObject({
    signHereTabs: [signHere],
  });

  return tabs;
};

export const makeEnvelope = (name, email, templateId) => {
  // create the signer model
  const signer1 = docusign.TemplateRole.constructFromObject({
    email: email,
    name: name,
    roleName: "signer1",
  });

  // create the envelope model
  const envelopeDefinition = docusign.EnvelopeDefinition.constructFromObject({
    templateRoles: [signer1],
    status: "created",
    templateId: templateId,
  });
  return envelopeDefinition;
};


export const formFields = (documentId, name, email, company) => {
  const docGenFormFieldRequest =
    docusign.DocGenFormFieldRequest.constructFromObject({
      docGenFormFields: [
        docusign.DocGenFormFields.constructFromObject({
          documentId: documentId,
          docGenFormFieldList: [
            docusign.DocGenFormField.constructFromObject({
              name: "Candidate_Name",
              value: name,
            }),
            docusign.DocGenFormField.constructFromObject({
              name: "Email",
              value: email,
            }),
            docusign.DocGenFormField.constructFromObject({
              name: "Company_Name",
              value: company,
            }),
          ],
        }),
      ],
    });

  return docGenFormFieldRequest;
}

const bufferHtml = async () => {
  const htmlString = `<p>TESTE</p>
  
  <p>{{Candidate_Name}}</p>
 
  <p>{{Email}}</p>
   
  <p>{{Company_Name}}</p>
   
  <p>&nbsp;</p>
   
  <p>&nbsp;</p>
   
  <p>&nbsp;</p>
   
  <p>&nbsp;</p>
   
  <p>&nbsp;</p>
   
  <p>Employee Signature {{signHere}}</p>`;

  const fileBuffer = await HTMLtoDOCX(htmlString, null, {
    table: { row: { cantSplit: true } },
    footer: true,
    pageNumber: true,
  });

  return fileBuffer;
}



