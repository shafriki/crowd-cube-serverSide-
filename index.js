require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// CORS Configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      "http://localhost:5173", 
      "http://localhost:5174", 
      "https://shafriki-crowdcube.surge.sh"  
    ];
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// MongoDB URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.2a8vu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // Connect the client to the server
    // await client.connect();

    const campaignCollection = client.db('crowdCubeDB').collection('campaign');
    const userCollection = client.db('crowdCubeDB').collection('users');

    // campaign api
    app.get('/campaign', async (req, res) => {
      const cursor = campaignCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get('/campaign/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await campaignCollection.findOne(query);
      res.send(result);
    });

    app.post('/campaign', async (req, res) => {
      const newCampaign = req.body;
      console.log(newCampaign);
      const result = await campaignCollection.insertOne(newCampaign);
      res.send(result);
    });

    // user api
    app.get('/users', async (req, res) => {
      const cursor = userCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post('/users', async (req, res) => {
      const newUser = req.body;
      console.log('creating new user', newUser);
      const result = await userCollection.insertOne(newUser);
      res.send(result);
    });

    // donate
    app.get('/donated', async (req, res) => {
      const cursor = userCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post('/donated', async (req, res) => {
      const donation = req.body;
    
      if (!donation.donorEmail || !donation.campaignId) {
        return res.status(400).send({ error: 'missing' });
      }
    
      try {
        const donatedCollection = client.db('crowdCubeDB').collection('donated');
        const result = await donatedCollection.insertOne(donation);
        res.status(201).send(result);
      } catch (error) {
        console.error('donation error:', error);
        res.status(500).send({ error: 'Failed to process the donation.' });
      }
    });

    // my donation
    app.get('/donations', async (req, res) => {
      const email = req.query.email;
      
      if (!email) {
          return res.status(400).send({ error: "Email is required." });
      }
      
      try {
          const donatedCollection = client.db('crowdCubeDB').collection('donated');
          const donations = await donatedCollection.find({ donorEmail: email }).toArray();
          res.send(donations);
      } catch (error) {
          console.error('Fetch donations error:', error);
          res.status(500).send({ error: "Failed to fetch donations." });
      }
    });

    // New route for fetching campaigns based on user email
    app.get('/campaign/email/:email', async (req, res) => {
      const email = req.params.email;

      try {
        // Query campaigns collection for campaigns related to the given email
        const query = { userEmail: email };  // Assuming campaigns have an 'email' field
        const result = await campaignCollection.find(query).toArray();
        
        // Send the result as response
        res.send(result);
      } catch (error) {
        console.error('Error fetching campaigns by email:', error);
        res.status(500).send({ error: 'Failed to fetch campaigns for this email.' });
      }
    });

    // delete campaign api
    app.delete('/campaign/:id', async (req, res) => { 
      const id = req.params.id; 
      const query = { _id: new ObjectId(id) }; 
    
      try {
        const result = await campaignCollection.deleteOne(query); 
        if (result.deletedCount === 1) {
          res.send({ message: 'Campaign deleted successfully.' });
        } else {
          res.status(404).send({ error: 'Campaign not found.' });
        }
      } catch (error) {
        console.error('Error deleting campaign:', error); 
        res.status(500).send({ error: 'Failed to delete the campaign.' });
      }
    });

    // update campaign api
    app.put('/campaign/:id', async (req, res) => {
      const id = req.params.id;
      const updatedCampaign = req.body;
    
      // Validate the incoming data
      if (!updatedCampaign || Object.keys(updatedCampaign).length === 0) {
        return res.status(400).send({ error: 'No data provided for update.' });
      }
    
      try {
        const filter = { _id: new ObjectId(id) }; // Identify the campaign to update
        const options = { upsert: false }; // Prevent creating a new document if not found
    
        // Prepare the updated fields
        const updateData = {
          $set: {
            image: updatedCampaign.image,
            title: updatedCampaign.title,
            campaignType: updatedCampaign.campaignType,
            deadline: updatedCampaign.deadline,
            minDonation: updatedCampaign.minDonation,
            userEmail: updatedCampaign.userEmail,
            userName: updatedCampaign.userName,
            description: updatedCampaign.description,
          },
        };
    
        // Perform the update operation
        const result = await campaignCollection.updateOne(filter, updateData, options);
    
        if (result.matchedCount === 0) {
          return res.status(404).send({ error: 'Campaign not found.' });
        }
    
        res.send({ message: 'Campaign updated successfully.', result });
      } catch (error) {
        console.error('Error updating campaign:', error);
        res.status(500).send({ error: 'Failed to update the campaign.' });
      }
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// Home Route
app.get('/', (req, res) => {
  res.send('CrowdCube server running...');
});

// Start the server
app.listen(port, () => {
  console.log(`CrowdCube Server running on port: ${port}`);
});
