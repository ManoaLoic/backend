const auth = require("../middleware/auth");
const { User, validate } = require("../model/Users");
const bcrypt = require("bcrypt");
const express = require("express");
const router = express.Router();

router.post("/", async (req, res) => {
    try {
        req.body.userType = {
            "_id":"63d6e19a6f427cc3ec7e0640"
        };
        console.log('body',req.body);
        const { error } = validate(req.body);
        if (error) return res.status(500).send(error.details[0].message);

        const user = new User(req.body);

        const salt = await bcrypt.genSalt(Number(process.env.SALT));
        user.password = await bcrypt.hash(user.password, salt);
        await user.save();

        res.send(user);
    } catch (error) {
        console.log(error);
        res.send("An error occured");
    }
});


module.exports = router;

router.get("/me", auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("-password -__v");
        res.send(user);
    } catch (error) {
        console.log(error);
        res.send("An error occured");
    }
});

module.exports = router;