import docusign from 'docusign-esign';
import { response } from 'express';
import { getEnvelopesApi, getTemplatesApi, makeTemplate, templateDocument, recipientTabs, makeEnvelope, formFields } from '../services/docusignService.js';
import { checkToken } from '../utils/authentication.js';

export const postEnvelope = async (request, response) => {
  await checkToken(request);
  let envelopesApi = getEnvelopesApi(request);
  let templatesApi = getTemplatesApi(request);

  const templateData = makeTemplate(request);
  const template = await templatesApi.createTemplate(process.env.ACCOUNT_ID, { envelopeTemplate: templateData });
  const templateId = template.templateId

  const documentData = await templateDocument(request);
  const documentId = '1';
  await templatesApi.updateDocument(process.env.ACCOUNT_ID, templateId, documentId, { envelopeDefinition: documentData });

  let tabs = recipientTabs(request.body.anchorString);
  let recipientId = '1';
  await templatesApi.createTabs(process.env.ACCOUNT_ID, templateId, recipientId, { templateTabs: tabs });
  
  tabs = recipientTabs(request.body.anchorString2);
  recipientId = '2';
  await templatesApi.createTabs(process.env.ACCOUNT_ID, templateId, recipientId, { templateTabs: tabs });

  const envelopeData = makeEnvelope(request, templateId);
  const envelope = await envelopesApi.createEnvelope(process.env.ACCOUNT_ID, { envelopeDefinition: envelopeData });
  const envelopeId = envelope.envelopeId;

  const docGenFormFieldsResponse = await envelopesApi.getEnvelopeDocGenFormFields(process.env.ACCOUNT_ID, envelopeId);
  const documentIdGuid = docGenFormFieldsResponse.docGenFormFields[0].documentId;

  const formFieldsData = formFields(documentIdGuid, request);
  await envelopesApi.updateEnvelopeDocGenFormFields(process.env.ACCOUNT_ID, envelopeId, { docGenFormFieldRequest: formFieldsData });

  // response.redirect(results.url);

  const sendEnvelopeReq = docusign.Envelope.constructFromObject({
    status: 'sent',
  });

  response.send("Sucess!");

  return await envelopesApi.update(process.env.ACCOUNT_ID, envelopeId, { envelope: sendEnvelopeReq });
}
