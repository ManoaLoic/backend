const { User } = require("../model/Users");
const bcrypt = require("bcrypt");
const Joi = require("joi");
const express = require("express");
const router = express.Router();

router.post("/", async (req, res) => {
    try {
        console.log('body', req.body);
        const { error } = validate(req.body);
        if (error) return res.status(401).send(error.details[0].message);

        const user = await User.findOne({ email: req.body.email });
        if (!user) return res.status(401).send("Invalid email or password");

        const validPassword = await bcrypt.compare(
            req.body.password,
            user.password
        );
        if (!validPassword)
            return res.status(401).send("Invalid email or password");

        const token = user.generateAuthToken();
        res.send({
            "token" : token,
            "user" : {
                "name" : user.name,
                "email" : user.email,
                "userType" : user.userType,
            }
        });
    } catch (error) {
        console.log(error);
        res.send("An error occured");
    }
});

const validate = (user) => {
    const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required(),
    });
    return schema.validate(user);
};

module.exports = router;