import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import session from 'express-session';
import { checkToken } from './utils/authentication.js';
import docusignRoutes from './routes/docusignRoutes.js'

dotenv.config();

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: "ll493843fb712",
  resave: true,
  saveUninitialized: true
}));

app.use(express.static('public'));
app.use(express.json());
app.use('/', docusignRoutes);
app.get("/", async (request, response) => {
  await checkToken(request);
  response.sendFile("C:/Users/Estagiario01/Desktop/Gabriel/remoteDocusign/src/main.html");
});
app.get("/success", (request, response) => {
  response.send("Sucess");
});
app.listen(8000, () => {
  console.log("Server has started!", process.env.USER_ID);
})

//https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=c9e816b7-a3be-402e-89b0-edcc0f21b492&redirect_uri=http://localhost:8000/














