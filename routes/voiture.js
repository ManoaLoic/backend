var express = require('express');
const { default: mongoose } = require('mongoose');
var router = express.Router();
const Voiture = require('../model/Voiture');

/** create voiture */
router.post('/ajout-voiture', function(req, res, next) {
  const body = req.body;
  body.idUser = mongoose.Types.ObjectId(req.user._id);
  const d = new Voiture(body);
  d.save((err) => {
    if (err){
      console.log('Error on insert voiture', err);
      res.sendStatus(500);
      return;
    } 
    res.send(d);
  })
});

/**get voiture */
router.get('/getVoitures', function(req, res, next) {
  const idUser = req.user._id; 
  console.log(req.user);
  console.log('idUser', idUser);
  Voiture.find({
    "idUser": mongoose.Types.ObjectId(idUser),
  }, "id marque model immatriculation userId", (err, docs) => {
    if (err) console.log('Error', err);
    res.send(docs);
    console.log(docs);
  });
});

module.exports = router;
