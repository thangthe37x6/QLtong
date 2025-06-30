import express from 'express';
import dotenv from 'dotenv';
import bodyParser from 'body-parser'; 
import cookieParser from 'cookie-parser';
import { connectDB } from './config/conect_mg.js';
import routermain from './routers/main.js';
import routerAuth from './routers/auth.js';
import expressLayouts from 'express-ejs-layouts';
import routerMainUser from './routers/mainuser.js';
dotenv.config();

const app = express();
app.set('view engine', 'ejs');
app.set('views', 'views');
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(expressLayouts);
app.set('layout', 'main');
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.use("/", routerAuth); 
app.use("/", routermain); 
app.use("/", routerMainUser); 


const PORT = process.env.PORT;
connectDB(process.env.URI).then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Server is running at http://localhost:${PORT}/login`);
  });
});