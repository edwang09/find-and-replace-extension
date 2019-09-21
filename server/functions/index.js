// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require('firebase-functions');

// The Firebase Admin SDK to access the Firebase Realtime Database. 
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

const express = require('express');
const basicAuth = require('express-basic-auth')
const stringify = require('csv-stringify');

const cors = require('cors');
//real
const stripe = require('stripe')('sk_live_f75U5V4LuncKrGiNZX7WOkYB');
//test
// const stripe = require('stripe')('sk_test_KH4zrklmDNuYPURjP2XGP1h3');
const app = express();

const bodyParser = require('body-parser');
// Inserts feedback message into our real time database
function submitFeedback(endpointRef, feedbackMessage) {
  if (!feedbackMessage) {
    return Promise.resolve(400);
  }
  return admin.database().ref(endpointRef).push({
    message: feedbackMessage,
    timestamp: Date.now(),
    timedate: new Date().toLocaleString()
  })
  .then(() => 200);
}

exports.submitUninstallFeedback = functions.https.onRequest((req, res) => {
  const statusPromise = submitFeedback('/feedback/uninstall', JSON.parse(req.body).feedback);
  statusPromise.then(status => {
    res.status(status).end();
  });
});

exports.submitGeneralFeedback = functions.https.onRequest((req, res) => {
  const statusPromise = submitFeedback('/feedback/general', JSON.parse(req.body).feedback);
  statusPromise.then(status => {
    res.status(status).end();
  });
});


// Automatically allow cross-origin requests
app.use(cors());
app.get('/', (req, res) => res.send("payment works"))
app.post('/create', bodyParser.raw({type: '*/*'}),  (request, response) => {
    const sig = request.headers['stripe-signature'];
    //real
    const endpointSecret = 'whsec_qGlrFsr4eaKhhDzc9nLTMcTCeMeFhRdz';
    //test
    // const endpointSecret = 'whsec_N1uuj8ywgppzxaOLlP6lKXIXinEOln3T';

    console.log("Webhook recieved")
    let event;

    try {
        event = stripe.webhooks.constructEvent(request.rawBody, sig, endpointSecret);
    } catch (err) {
        console.log(err.message)
        return response.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(request.body.data.object.client_reference_id)
    console.log(request.body.data)
    console.log(event.type)
    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed' && request.body.data.object.client_reference_id) {
      console.log("checked")
        admin.database().ref("/subscription").orderByChild("email").equalTo(request.body.data.object.client_reference_id.toLowerCase()).once("value", function(snapshot) {
            if(!snapshot.exists()){
              admin.database().ref("/subscription").push({
                  email: request.body.data.object.client_reference_id.toLowerCase(),
                  customer: request.body.data.object.customer,
                  subscription: request.body.data.object.subscription,
                  timestamp: Date.now(),
                  data: request.body.data
                })
                .then(() => {
                    console.log("email stored.")
                });
            }else{
              console.log("/subscription/"+snapshot.val().key)
              console.log("duplicate oayment")
            }
        });
    }
    // Return a response to acknowledge receipt of the event
    response.json({received: true});
});
app.post('/delete/:id', (request, response) => {
  stripe.subscriptions.update(
    request.params.id,
    {
      cancel_at_period_end: true
    },
    function(err, confirmation) {
      if(err){
        response.json({canceled: false, err: err});
      }else{
          response.json({canceled: true, confirmation: confirmation});
 
      }
    }
  );
});

app.post('/store',(request, response) => {
  console.log(request.body.email)
  if(request.body.email){
    admin.database().ref("/emails").orderByChild("email").equalTo(request.body.email.toLowerCase()).once("value", function(snapshot) {
      if(snapshot.exists()){
        console.log("email already exist")
        response.json({msg: "email already exist"});
      }else{
        console.log("email not exist")
        admin.database().ref("/emails").push({
          email: request.body.email.toLowerCase(),
          timestamp: Date.now(),
        })
        .then(() => {
          response.json({msg: "email added"});
        });
      }
    });
  }
  
});


app.get('/emaillist',basicAuth({
  challenge: true,
  users: { 'adam': 'adam' }
}),(req, res) => {
    admin.database().ref("/emails").on("value", function(snapshot) {
      data = Object.values(snapshot.val())
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=\"' + 'emaillist.csv\"');
      stringify(data, { header: true })
      .pipe(res);
    });
});

app.get('/:email',(request, response) => {

  return response.json({exists: true, subscription: true});
  console.log(request.params.email)
  console.log(request.params.email.toLowerCase())
  admin.database().ref("/subscription").orderByChild("email").equalTo(request.params.email.toLowerCase()).once("child_added", function(snapshot) {
      if(snapshot.exists() && snapshot.val().customer){
        stripe.subscriptions.list(
          { customer: snapshot.val().customer },
          function(err, subscriptions) {
            if(subscriptions.data && subscriptions.data.length > 0){
              response.json({exists: true, subscription: subscriptions.data[0]});
            }else{
              admin.database().ref("/subscription/"+snapshot.key).remove()
              response.json({exists: false, err: err});
            }
        });
      }else{
          response.json({exists: false});
      }
    });
});


app.post('/manualcreate',(req, res) => {
  const item = req.body
  admin.database().ref("/subscription").push({
    email: item.email,
    customer: item.customer,
    subscription: item.subscription,
    timestamp: Date.now(),
    data: item.data
  })
  .then(() => {
      console.log("email stored.")
      res.send("addition complete")
  });
});


// Expose Express API as a single Cloud Function:
exports.payment = functions.https.onRequest(app);