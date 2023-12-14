const express = require('express');
require('dotenv').config();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// app.use(cors({
//     origin: ['http://localhost:5173', 'https://save-life-medical-camp.web.app'],
//     credentials: true
// }));
app.use(cors());
app.use(express.json());

//middlewares
const verifyToken = (req, res, next) => {
    console.log('verify token', req.headers.authorization);
    if (!req.headers.authorization) {
        return res.status(401).send('Unauthorized request');
    }
    const token = req.headers.authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send('Unauthorized request');
        }
        req.decoded = decoded;
        next();
    })
    //next();
}

const uri = `mongodb+srv://${process.env.DB_User}:${process.env.DB_Pass}@cluster0.alzohbu.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


const dbConnect = async () => {
    try {
        client.connect()
        console.log('SAVE LIFE DB Connected Successfully✅')
    } catch (error) {
        console.log(error.name, error.message)
    }
}
dbConnect()



const campCollection = client.db("SaveLifeDB").collection("camps");
const upcomingCampsCollection = client.db("SaveLifeDB").collection("upcomingCamps");
const participantCollection = client.db("SaveLifeDB").collection("participants");
const userCollection = client.db("SaveLifeDB").collection("users");
const paymentCollection = client.db("SaveLifeDB").collection("payments");
const reviewCollection = client.db("SaveLifeDB").collection("reviews");
const doctorsCollection = client.db("SaveLifeDB").collection("doctors");


app.get('/', (req, res) => {
    res.send('SAVE LIFE MEDICAL CAMP!');
});


//jwt api
app.post('/jwt', async (req, res) => {
    const user = req.body;
    const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h'
    });
    res.send({ token });
})





//user collection
app.post('/users',  async (req, res) => {
    const user = req.body;
    const query = { email: user.email };
    const existingUser = await userCollection.findOne(query);
    if (existingUser) {
        return res.send({ message: 'User already exists' });
    }
    const result = await userCollection.insertOne(user);
    res.send(result);
})

app.get('/users', verifyToken, async (req, res) => {
    //console.log(req.headers);
    const result = await userCollection.find({}).toArray();
    res.send(result);
})

app.delete('/users/:id', verifyToken, async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await userCollection.deleteOne(query);
    res.send(result);
})

app.get('/doctors', async (req, res) => {
    const result = await doctorsCollection.find({}).toArray();
    res.send(result);

})

app.get('/doctors/:id', async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await doctorsCollection.findOne(query);
    res.send(result);
})

app.get('/doctorsInfo/:email', async (req, res) => {
    const email = req.params.email;
    const query = { email: email };
    const result = await doctorsCollection.findOne(query);
    res.send(result);
})
//update profile api's
app.get('/users/:email', verifyToken, async (req, res) => {
    const email = req.params.email;
    const query = { email: email };
    const result = await userCollection.findOne(query);
    res.send(result);
})

app.get('/usersLogin', async (req, res) => {
    const { email, role } = req.query;

    const query = {};
    if (email) query.email = email;
    if (role) query.role = role;

    const result = await userCollection.findOne(query);

    res.send(result);
});


app.patch('/users/:id', verifyToken, async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updatedDoc = {
        $set: {
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone,
            address: req.body.address,
            dob: req.body.dob,
            photoURL: req.body.photoURL
        }
    }
    const result = await userCollection.updateOne(filter, updatedDoc);
    res.send(result);
})


//common api
app.get('/camp', async (req, res) => {
    const today = new Date().toISOString();


    const cursor = campCollection.find({ date: { $gte: today } });
    const camps = await cursor.toArray();
    res.send(camps);
});
app.get('/manageCamp', verifyToken, async (req, res) => {

    const cursor = campCollection.find({});
    const camps = await cursor.toArray();
    res.send(camps);
});


app.get('/previousCamp', async (req, res) => {
    const today = new Date().toISOString();


    const cursor = campCollection.find({ date: { $lte: today } }).sort({ date: -1 });
    const camps = await cursor.toArray();
    res.send(camps);
});

//admin api
app.post('/camp', verifyToken, async (req, res) => {
    const camp = req.body;
    const result = await campCollection.insertOne(camp);
    res.send(result);

})

app.post('/upcomingCamp', verifyToken, async (req, res) => {
    const camp = req.body;
    const result = await upcomingCampsCollection.insertOne(camp);
    res.send(result);

})

app.get('/upcomingCamp', async (req, res) => {
    const cursor = await upcomingCampsCollection.find({}).toArray();
    res.send(cursor);
})


app.put('/camp/:id', verifyToken, async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const updatedCamp = req.body;
    const result = await campCollection.updateOne(query, { $set: updatedCamp });
    res.send(result);

})

app.delete('/camp/:id', verifyToken, async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await campCollection.deleteOne(query);


    const query2 = { campId: id };
    const result2 = await participantCollection.deleteMany(query2);
    const result3 = await paymentCollection.deleteMany(query2);
    res.send({ result, result2, result3 });

})


//make admin

app.patch('/users/admin/:id', verifyToken, async (req, res) => {
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

//make payment accepted
app.patch('/payment/:id', verifyToken, async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updatedDoc = {
        $set: {
            status: 'accepted'
        }
    }
    const result = await paymentCollection.updateOne(filter, updatedDoc);
    res.send(result);
})

//user access api
app.get('/joinCamp/:id', async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const camp = await campCollection.findOne(query);
    res.send(camp);
})

app.post('/reviews', verifyToken, async (req, res) => {
    const review = req.body;
    const result = await reviewCollection.insertOne(review);
    res.send(result);

})
app.get('/reviews', async (req, res) => {
    const cursor = await reviewCollection.find({}).toArray();
    res.send(cursor);
})

app.get('/reviews/:id', async (req, res) => {
    const id = req.params.id;
    const query = { campId: id };
    const result = await reviewCollection.find(query).toArray();
    res.send(result);
})

app.get('/popularCamp', async (req, res) => {
    const cursor = await campCollection.find({}).sort({ participants: -1 }).limit(6).toArray();
    res.send(cursor);
})

app.post('/participants', verifyToken, async (req, res) => {
    const participant = req.body;
    const result = await participantCollection.insertOne(participant);

    const query = { _id: new ObjectId(participant.campId) };
    const updatedDoc = {
        $inc: {
            participants: 1
        }
    }

    const updateResult = await campCollection.updateOne(query, updatedDoc);
    res.send({ result, updateResult })
})
app.patch('/participantsNumber/:id', verifyToken, async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const updatedDoc = {
        $inc: {
            participants: -1
        }
    }

    const updateResult = await campCollection.updateOne(query, updatedDoc);
    res.send(updateResult)
})

app.get('/joinedCamp', verifyToken, async (req, res) => {
    const email = req.query.email;
    const query = { email: email };
    const result = await participantCollection.find(query).toArray();
    res.send(result);
})


app.get('/paidCamp/:email',  async (req, res) => {
    const email = req.params.email;
    const query = { email: email };
    const result = await paymentCollection.find(query).toArray();
    res.send(result);
})
//for payment
app.get('/participants/:id', verifyToken, async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await participantCollection.findOne(query);
    res.send(result);
})

//delete registered camp by user
app.delete('/joinedCamp/:id', verifyToken, async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await participantCollection.deleteOne(query);
    res.send(result);
})


//admin access api
app.get('/bookings', verifyToken, async (req, res) => {
    const result = await paymentCollection.find({}).toArray();
    res.send(result);
})
app.delete('/bookings/:id', verifyToken, async (req, res) => {
    const id = req.params.id;
    const query = { campId: id };
    const result = await participantCollection.deleteOne(query);
    res.send(result);
})


//payment
app.post('/create-payment-intent', verifyToken, async (req, res) => {
    const { price } = req.body;
    const amount = parseInt(price * 100);

    console.log(amount, 'amount inside');

    const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
    });
    res.send({
        clientSecret: paymentIntent.client_secret,
    });
});


app.post('/payment', verifyToken, async (req, res) => {
    const payment = req.body;
    const paymentResult = await paymentCollection.insertOne(payment);

    const query = { _id: new ObjectId(payment.regId) };
    const deleteResult = await participantCollection.deleteOne(query);

    res.send({ paymentResult, deleteResult });
})


app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});