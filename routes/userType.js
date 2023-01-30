const express = require('express');
const router = express.Router();
const auth = require("../middleware/auth");
const UserType = require('../model/UserType');

//Ajoutez la validation ici 

router.post("/", async (req, res) => {
  try {
      const userType = new UserType(req.body);

      await userType.save();

      res.send(userType);
  } catch (error) {
      console.log(error);
      res.status(500).send("An error occured");
  }
});

router.get("/", auth, async (req, res) => {
  try {
      const userType = await UserType.findById(req.user._id).select("-__v");
      res.send(userType);
  } catch (error) {
      console.log(error);
      res.status(500).send("An error occured");
  }
});

module.exports = router;
