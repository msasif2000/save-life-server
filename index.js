const express = require('express');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('SAVE LIFE MEDICAL CAMP!');
});

console.log(process.env.DB_User);

const uri = `mongodb+srv://${process.env.DB_User}:${process.env.DB_Pass}@cluster0.alzohbu.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        //await client.connect();
        const campCollection = client.db("SaveLifeDB").collection("camps");
        const participantCollection = client.db("SaveLifeDB").collection("participants");
        const userCollection = client.db("SaveLifeDB").collection("users");
        const reviewCollection = client.db("SaveLifeDB").collection("reviews");


        //jwt api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1h'
            });
            res.send({ token });
        })

        //middlewares
        const verifyToken = (req, res, next) => {
            console.log('verify token', req.headers.authorization);
            if(!req.headers.authorization){
                return res.status(401).send('Unauthorized request');
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if(err){
                    return res.status(401).send('Unauthorized request');
                }
                req.decoded = decoded;
                next();
            })
            //next();
        }

        app.get('/user/admin/:email',verifyToken,  async(req, res)=> {
            const email = req.params.email;
            if(email!==req.decoded.email){
                return res.status(403).send('Unauthorized request');
            }

            const query = { email: email };
            const user = await userCollection.findOne(query);
            const admin =false;
            if(user){
                admin=user?.role==='admin';
            }
            res.send({admin});
        })

        //user collection
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email };
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'User already exists' });
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        })

        app.get('/users',verifyToken, async (req, res) => {
            //console.log(req.headers);
            const result = await userCollection.find({}).toArray();
            res.send(result);
        })

        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await userCollection.deleteOne(query);
            res.send(result);
        })



        //common api
        app.get('/camp', async (req, res) => {
            const cursor = campCollection.find({});
            const camps = await cursor.toArray();
            res.send(camps);
        })



        //admin api
        app.post('/camp', async (req, res) => {
            const camp = req.body;
            const result = await campCollection.insertOne(camp);
            res.send(result);

        })

        app.put('/camp/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const updatedCamp = req.body;
            const result = await campCollection.updateOne(query, { $set: updatedCamp });
            res.send(result);

        })

        app.delete('/camp/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await campCollection.deleteOne(query);
            res.send(result);

        })


        //make admin

        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result);
        })

        //user access api
        app.get('/joinCamp/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const camp = await campCollection.findOne(query);
            res.send(camp);
        })

        app.post('/participants', async (req, res) => {
            const participant = req.body;
            const result = await participantCollection.insertOne(participant);
            res.json(result);
        })

        app.get('/bookings', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const result = await participantCollection.find(query).toArray();
            res.send(result);
        })
        app.delete('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { campId: id };
            const result = await participantCollection.deleteOne(query);
            res.send(result);
        })
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        //await client.close();
    }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});