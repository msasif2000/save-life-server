const express = require('express');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('SAVE LIFE Medical Camp!');
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
        const reviewCollection = client.db("SaveLifeDB").collection("reviews");


        app.get('/camp', async(req, res) => {
            const cursor = campCollection.find({});
            const camps = await cursor.toArray();
            res.send(camps);
        })

        app.post('/camp', async(req, res) => {
            const camp = req.body;
            const result = await campCollection.insertOne(camp);
            res.send(result);
        
        })

        app.put('/camp/:id', async(req, res)=> {
            const id = req.params.id;
            const query = {_id:new ObjectId(id)};
            const updatedCamp = req.body;
            const result = await campCollection.updateOne(query, {$set: updatedCamp});
            res.send(result);
        
        })

        app.delete('/camp/:id', async(req, res) => {
            const id = req.params.id;
            const query = {_id:new ObjectId(id)};
            const result = await campCollection.deleteOne(query);
            res.send(result);
        
        })

        app.get('/joinCamp/:id', async(req, res)=> {
            const id = req.params.id;
            const query = {_id:new ObjectId(id)};
            const camp = await campCollection.findOne(query);
            res.send(camp);
        })

        app.post('/participants', async(req, res) => {
            const participant = req.body;
            const result = await participantCollection.insertOne(participant);
            res.json(result);
        })
       
        app.get('/bookings', async(req, res) => {
            const email = req.query.email;
            const query = {email: email};
            const result = await participantCollection.find(query).toArray();
            res.send(result);
        })
        app.delete('/bookings/:id', async(req, res) => {
            const id = req.params.id;
            const query = {campId: id};
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