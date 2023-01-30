var express = require('express');
var router = express.Router();
const Facture = require('../model/Facture');
const mongoose = require("mongoose");

/**Avoir le bénéfice par mois */
router.get('/benefices', function(req, res, next) {
  if(req.user.userType != '63d6e20a6f427cc3ec7e0644'){
    return res.status(401).send('Unauthorized');
  }
  const annee = parseInt(req.query.annee); 
  console.log('annee', annee);
  Facture.aggregate([
    {
      $unwind: "$paiements"
    },
    {
      $match: {
        type: { 
          $exists: true,
        },
        $expr : {
          $eq: [{ $year: "$paiements.date_paiement" }, annee]
        },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$paiements.date_paiement" } },
        sommeEntree: { $sum: "$paiements.entree" },
        sommeSortie: { $sum: "$paiements.sortie" },
      }
    },
    {
      $project: {
          _id: "$_id",
          total: { $subtract: [ '$sommeEntree', '$sommeSortie' ] }
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

/**Temps moyen de réparation pour une voiture */
router.get('/chiffres/:filtre', function(req, res, next) {
  if(req.user.userType != '63d6e20a6f427cc3ec7e0644'){
    return res.status(401).send('Unauthorized');
  }
  const filtre = req.params.filtre; 
  const annee = parseInt(req.query.annee); 
  console.log('filtre', filtre);
  console.log('annee', annee);
  const format = (filtre == 'jour') ? "%Y-%m-%d" : "%Y-%m";
  Facture.aggregate([
    {
      $unwind: "$paiements"
    },
    {
      $match: {
        type: { 
          $exists: true,
          $eq: "Depot" 
        },
        $expr : {
          $eq: [{ $year: "$paiements.date_paiement" }, annee]
        }
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: format, date: "$paiements.date_paiement" } },
        total: { $sum: "$paiements.entree" }
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

router.put('/payer/:idFacture', function(req, res, next) {
  const idFacture = req.params.idFacture;
  const montant = req.body.montant;
  Facture.findById(idFacture, (err, docs) => {
    if (err) 
      return res.status(500).send(err);
    
    const reste = docs.reste - montant;
    docs.reste = reste;

    if(!docs.paiements){
      console.log('Création paiement');
      docs.paiements = [];
    }
    docs.paiements.push({
      "date_paiement" : new Date(),
      "entree" : montant,
      "reste" : reste
    });

    const toUpdate = {
      "reste" : docs.reste,
      "paiements" : docs.paiements
    };
    console.log('docs updated', toUpdate);

    Facture.findByIdAndUpdate(idFacture, toUpdate,{"new":true}, (err, docs) => {
      if (err) 
        return res.status(500).send(err);
      res.send(docs);
    });

  })
});

router.post('/depenses', function(req, res, next) {
  const body = req.body;
  const facture = {
    "type" : "Depense",
    "raison" : body.raison,
    "remarque" : body.remarque,
    "paiements" : [
      {
        date_paiement : new Date(body.date_paiement),
        sortie : body.montant
      }
    ]
  };
  const d = new Facture(facture);
  d.save((err) => {
    if (err){
      console.log('Error on insert Facture', err);
      res.sendStatus(500);
      return;
    } 
    res.send(d);
  })
});

router.post('/', function(req, res, next) {
  const facture = req.body;
  const d = new Facture(facture);
  d.save((err) => {
    if (err){
      console.log('Error on insert Facture', err);
      res.sendStatus(500);
      return;
    } 
    res.send(d);
  })
});

/**get liste depenses */
router.get('/depenses', function(req, res, next) {
  Facture.aggregate([
    {
      $match: {
        type: 'Depense'
      }
    },
    {
      $unwind: "$paiements"
    },
  ])
  .exec((err, result) => {
    if (err) {
      console.log(err);
      return;
    }
    
    console.log(result);
    res.send(result);
  });
});

/**get Paiement */
router.get('/', function(req, res, next) {
  const userId = req.user._id; 
  Facture.aggregate([
    {
      $lookup: {
          from: "depots",
          localField: "idDepot",
          foreignField: "_id",
          as: "depot"
      },
    },
    {
      $lookup: {
          from: "users",
          localField: "depot.idUser",
          foreignField: "_id",
          as: "user"
      },
    },
    {
      $match: {
        'user._id': mongoose.Types.ObjectId(userId)
      },
    },
  ], function (err, result) {
    if (err){
      console.log('Erreur sur aggregation réparation moyen', err);
      return res.status(500).send(err);
    }
    console.log(result);
    result.forEach(item => {
      if(item.depot.length > 0 ) item.depot = item.depot[0];
      if(item.user.length > 0 ) item.user = item.user[0];
    });
    res.send(result);
  });
});

router.get('/:idDepot', function(req, res, next) {
  const idDepot = req.params.idDepot; 
  console.log('idDepot', idDepot);
  Facture.find({
    idDepot: mongoose.Types.ObjectId(idDepot),
  }, "id idDepot net_a_payer reste paiements", (err, docs) => {
    if (err) console.log('Error', err);
    res.send(docs);
    console.log(docs);
  });
});

module.exports = router;
