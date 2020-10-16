const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs-extra');
const fileUpload = require('express-fileupload');
const admin = require('firebase-admin');
const MongoClient = require('mongodb').MongoClient;
const port = 5000;

const app = express();

app.use(bodyParser.json());
app.use(cors());
app.use(express.static('Project-file'));
app.use(fileUpload());

var serviceAccount = require("./creative-agency-3870e-firebase-adminsdk-v4pbm-c7734ffd38.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://creative-agency-3870e.firebaseio.com"
});



const uri = "mongodb+srv://Adnan:cMFqvEHMF3yE0Kek@cluster0.vuwbx.mongodb.net/creative-agency?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
client.connect(err => {
  const adminCollection = client.db("creative-agency").collection("admins");
  const clientCollection = client.db("creative-agency").collection("clients");
  const servicesCollection = client.db("creative-agency").collection("services");
  const reviewCollection = client.db("creative-agency").collection("reviews");

    app.get('/orderList',(req,res) => {
        const bearer = req.headers.authorization;
        if(bearer && bearer.startsWith('Bearer ')){
            const idToken  = bearer.split(' ')[1];
            admin.auth().verifyIdToken(idToken)
            .then(decodedToken => {
                const tokenEmail = decodedToken.email;
                const queryEmail = req.query.email;
                if(tokenEmail === queryEmail){
                    clientCollection.find({email: queryEmail})
                    .toArray((err,results) => {
                        res.status(200).send(results);
                    })
                }
                else{
                    res.status(401).send("unauthorized access")
                }
            })
            .catch((error) => {
                res.status(401).send("unauthorized access")
            });
        }
        else {
            res.status(401).send("unauthorized access")
        }
    })

    app.post('/addReview',(req,res) => {
        reviewCollection.insertOne(req.body)
        .then(result => {
            res.send(result.insertedCount > 0)
        })
    });

    app.post('/addAdmin',(req,res) => {
        adminCollection.insertOne(req.body)
        .then(result => {
            res.send(result.insertedCount > 0)
        })
    });

    app.post('/addClient',(req,res) => {
        const file = req.files.file;
        const name = req.body.name;
        const email = req.body.email;
        const description = req.body.description;
        const service = req.body.service;
        const price = req.body.price;
        const status = req.body.status;
        const filePath = `${__dirname}/Project-file/${file.name}`;
        file.mv(filePath, err=> {
            if(err){
                res.send.status(500).send({msg:"image upload failed."})
            }
            const newImg = fs.readFileSync(filePath);
            const encImg = newImg.toString('base64');

            const image = {
                contentType: req.files.file.mimetype,
                size: req.files.file.size,
                img: Buffer(encImg,'base64')
            }

            clientCollection.insertOne({name, email, image , description, service, price, status})
            .then(result => {
                fs.remove(filePath,err => {
                    if(err){
                        res.send.status(500).send(err);
                    }
                    res.send(result.insertedCount > 0)
                })
            })
        })
    })

    app.post('/addService',(req,res) => {
        const file = req.files.file;
        const title = req.body.title;
        const description = req.body.description;
        const filePath = `${__dirname}/Project-file/${file.name}`;
        file.mv(filePath, err=> {
            if(err){
                res.send.status(500).send({msg:"image upload failed."})
            }
            const newImg = fs.readFileSync(filePath);
            const encImg = newImg.toString('base64');

            const image = {
                contentType: req.files.file.mimetype,
                size: req.files.file.size,
                img: Buffer(encImg,'base64')
            }

            servicesCollection.insertOne({title, image , description})
            .then(result => {
                fs.remove(filePath,err => {
                    if(err){
                        res.send.status(500).send(err);
                    }
                    res.send(result.insertedCount > 0)
                })
            })
        })
    })

    app.get('/reviews',(req, res) => {
        reviewCollection.find({})
        .toArray((err,reviews) => {
            res.send(reviews)
        })
    })

    app.get('/isAdmin',(req, res) => {
        adminCollection.find({})
        .toArray((err,admin) => {
            res.send(admin)
        })
    })

    app.get('/services',(req, res) => {
        servicesCollection.find({})
        .toArray((err,reviews) => {
            res.send(reviews)
        })
    })
    
    app.get('/clients',(req, res) => {
        clientCollection.find({})
        .toArray((err,reviews) => {
            res.send(reviews)
        })
    }) 
});


app.listen(process.env.PORT || port);