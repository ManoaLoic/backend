var express = require('express');
var router = express.Router();
const Depot = require('../model/Depot');
const Facture = require('../model/Facture');
const mongoose = require("mongoose");

const pathFile = '../public/fichiers/';

router.get('/', function(req, res, next) {
  const userId = req.user._id;

  const match = {
    voitureId: { 
      $exists: true,
      $ne: "" 
    },
  };
  if(req.user.userType == '63d6e19a6f427cc3ec7e0640'){
    match.idUser = {
      $eq: mongoose.Types.ObjectId(userId)
    }
  }
  if(req.query.status){
    match.status = {
      $eq: req.query.status
    };
  }

  Depot.aggregate([
    {
      $match: match
    },
    {
      $lookup: {
          from: "voitures",
          localField: "voitureId",
          foreignField: "_id",
          as: "voiture"
      },
    },
  ], function (err, result) {
    if (err){
      console.log('Erreur sur aggregation réparation moyen', err);
      return res.status(500).send(err);
    }
    const retour = [];
    result.forEach(item => {
      if(item.voiture.length > 0 ){
        item.voiture = item.voiture[0];
        retour.push(item);
      }
    });
    console.log(retour);
    res.send(retour);
  });

  // Depot.find(criteria, "id voitureId date_depot status", (err, docs) => {
  //   if (err) console.log('Error', err);
  //   res.send(docs);
  //   console.log(docs);
  // });
});

router.put('/vehicule/:type/:id', function(req, res, next) {
  const id = req.params.id;
  const type = req.params.type;
  const body = {};

  if(type == 'entree'){
    body.date_remise = new Date();
  }else if(type == 'sortie'){
    body.date_sortie = new Date();
    body.status = 'Fermé';
  }else{
    return res.status(500).send('Vérifier le type envoyé');
  }

  Depot.findByIdAndUpdate(id, body,{"new":true}, async (error, docs) => {
    if (error) 
      return res.status(500).send(error);
    
    res.send(docs);
  });
});

/**Temps moyen de réparation pour une voiture */
router.get('/reparation-moyen/', function(req, res, next) {
  if(req.user.userType != '63d6e20a6f427cc3ec7e0644'){
    return res.status(401).send('Unauthorized');
  }
  const vehiculeId = req.query.idVehicule; 
  console.log('vehiculeId', vehiculeId);
  Depot.aggregate([
    {
      $match: {
        voitureId: { 
          $exists: true,
          $ne: "" 
        },
        date_fin_reparation: {
          $exists: true,
        },
        date_debut_reparation: {
          $exists: true,
        },
      }
    },
    {
      $lookup: {
          from: "voitures",
          localField: "voitureId",
          foreignField: "_id",
          as: "voitureLookup"
      },
    },
    {
      $group: {
        _id: "$voitureId",
        voiture: { $first: { $arrayElemAt: [ "$voitureLookup", 0 ] } },
        avgDifference: {
          $avg: {
            $subtract: [ "$date_fin_reparation", "$date_debut_reparation" ]
          }
        }
      }
    },
    {
      $project: {
          idVoiture: "$_id",
          marque: "$voiture.marque",
          model: "$voiture.model",
          immatriculation: "$voiture.immatriculation",
          moyenne : "$avgDifference"
      }
    }
  ], function (err, result) {
    if (err){
      console.log('Erreur sur aggregation réparation moyen', err);
      return res.status(500).send(err);
    }
    console.log(result);
    res.send(result);
  });
});

router.get('/listeReparation', function(req, res, next) {
  const idVoiture = req.query.idVoiture; 
  console.log('idVoiture', idVoiture);
  Depot.find({
    "voitureId":mongoose.Types.ObjectId(idVoiture),
  }, "ListeReparation", (err, docs) => {
    if (err) console.log('Error', err);
    const reps = [];
    docs.forEach(element => {
        if(element.ListeReparation && element.ListeReparation.length > 0){
          reps.push(...element.ListeReparation);
        }
    });
    res.send(reps);
    console.log(docs);
  });
});


const path = require('path');
const fs = require('fs');
const { route } = require('.');
const { Console } = require('console');

router.put('/decision-client/:id', function(req, res, next) {
  const id = req.params.id;
  const body = req.body;
  if(body.status == 'En cours')
    body.date_debut_reparation = new Date();
  Depot.findByIdAndUpdate(id, body,{"new":true}, async (error, docs) => {
    if (error) 
      return res.status(500).send(error);
    
    const somme = docs.ListeReparation.reduce((acc, cur) => acc + cur.montant, 0);

    const facture = {
      "idDepot": docs._id,
      "net_a_payer": somme,
      "reste": somme,
      "type":"Depot"
    };
    const d = new Facture(facture);
    const {err} = await d.save();
    if(err){
      console.log('error create Facture', err);
      res.status(500).send(err);
    }
    res.send(docs);
  });
});

router.put('/:id', function(req, res, next) {
    const id = req.params.id;
    const body = req.body;
    if(body.ListeReparation && body.ListeReparation.length > 0){
      const tab = body.ListeReparation.filter(item => {
        return item.status == 'Fait';
      })
      console.log('rep fait', tab);
      if(tab.length == body.ListeReparation.length){
        body.date_fin_reparation = new Date();
        body.status = 'En attente de récupération';
      }
    }
    Depot.findByIdAndUpdate(id, body,{"new":true}, (err, docs) => {
      if (err) 
        return res.status(500).send(err);
      res.send(docs);
    });
});

router.get('/nouveau', function(req, res, next) {
    Depot.find({
      "status": "En attente de devis",
    }, "id voitureId date_depot status", (err, docs) => {
      if (err) console.log('Error', err);
      res.send(docs);
      // console.log(docs);
    });
});

router.post('/upload-client', function(req, res, next) {
  let sampleFile;
  let uploadPath;

  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }

  sampleFile = req.files.pieces;
  uploadPath = path.join(__dirname, pathFile, sampleFile.name);

  sampleFile.mv(uploadPath, function(err) {
    if (err)
      return res.status(500).send(err);

    res.send('File uploaded!');
  });
})

/**get image */
router.get('/piece', function(req, res, next) {
  fs.readFile(path.join(__dirname, pathFile, req.query.nom), (err, data) => {
    if (err) throw err;
    res.send({
      "image" : new Buffer.from(data).toString("base64")
    });
  });
});

router.get('/:id', function(req, res, next) {
  Depot.aggregate([
    {
      $match: {
        _id: mongoose.Types.ObjectId(req.params.id)
      }
    },
    {
      $lookup: {
        from: 'voitures',
        localField: 'voitureId',
        foreignField: '_id',
        as: 'voiture'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'voiture.idUser',
        foreignField: '_id',
        as: 'user'
      }
    }
  ])
  .exec((err, result) => {
    if (err) {
      console.log(err);
      return;
    }
    if(result.length > 0){
      const depot = result[0];
      if(depot.voiture.length > 0 ) depot.voiture = depot.voiture[0];
      if(depot.user.length > 0){
        depot.user = {
          "name" : depot.user[0].name
        };
      }
      console.log(depot);
      res.send({
        "data" : depot,
        "user" : req.user
      });
    }
  });

});


router.post('/ajoutDepot', function(req, res, next) {
  if(!req.body) 
    res.sendStatus(400);  

  const body = req.body;

  let uploadPath;
  const files = body.pieces;
  const pieces = [];
  files.forEach(item => {
    let base64Image = item.content.split(';base64,').pop();
    uploadPath = path.join(__dirname, pathFile, item.name);
    pieces.push(item.name);
    fs.writeFile(uploadPath, base64Image, {encoding: 'base64'}, function(err) {
      if(err){
        console.log('error on create file', err);
      }
      console.log('File created');
    });
  });

  const item = {
    "voitureId": mongoose.Types.ObjectId(body.voitureId),
    "Description": body.Description,
    "date_depot": body.date_depot,
    "idUser": mongoose.Types.ObjectId(req.user._id),
    "pieces": pieces,
    "status": "En attente de devis",
  };
  // Object.entries(req.body).forEach(function(key,value) {
  //   item[key] = value;
  // });
  // item.status = "En attente de devis";
  const depot = new Depot(item);
  depot.save((err) => {
      if (err){
        console.log('Error on create Depot', err);
        res.sendStatus(500);      
      }
      res.send(depot);
      console.log('Create Depot:', depot);
  });
});

module.exports = router;
