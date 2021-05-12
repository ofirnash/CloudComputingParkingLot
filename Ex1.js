"use strict";
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const redis = require('redis')
const {promisify} = require('util')

const PORT = 8080;
const app = express();
app.set('view engine', 'ejs');
app.use(cors())
app.use(bodyParser.json());

let client = redis.createClient()
let setToRedis = promisify(client.set).bind(client)
let getFromRedis = promisify(client.get).bind(client)

//entry
app.post('/entry', async (req,res,next) =>{
    let plate = req.query.plate;
    let parkingLot = req.query.parkingLot;
    let ticketId = await getFromRedis('nextTicketId')
    ticketId == null ? ticketId = 1 : ticketId = parseInt(ticketId)

    let insertJSON = {
        'plate': plate,
        'parkingLot': parkingLot,
        'entryTime': Date.now(),
    };
    
    await setToRedis(ticketId,JSON.stringify(insertJSON))
    console.log('Car added to the parkingLot successfully');
    res.json({YourTicketId: ticketId})

    ticketId += 1;
    console.log(`Incrementing ticket id by one, the new value is ${ticketId}`);
    await setToRedis('nextTicketId',ticketId)
});

//exit
app.post('/exit', async (req,res,next) => {
    let ticketId = req.query.ticketId
    let parkingCarData = await getFromRedis(ticketId)

    parkingCarData == null ? res.json('Car with this ticketId does not exist in the parking lot') : parkingCarData = JSON.parse(parkingCarData)
	
    let minutes = (Date.now() - parkingCarData.entryTime) / 60000;
    console.log(`Parked ${minutes} minutes`);
    let charge = Math.floor(minutes / 15) * 2.5;
    res.json({licensePlate: parkingCarData.plate, totalParkedTimeInMinutes: minutes, parkingLotId: parkingCarData.parkingLot, chargeAmount: charge})
});

//Start Web Server
app.listen(PORT,() => {
    console.log('Listening on port %d!',PORT);
});