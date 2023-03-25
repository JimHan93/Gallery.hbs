/*
Purchase.js
author: Jim Han
*/
const express = require("express");
const router = express.Router();
const bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({ extended: true }));


module.exports = function (images) {
    router.get("/", async function (req, res) {
        if (!req.GallerySession.loggedIn) {
            res.redirect('/');
            return;
          }
        try {
            const selected = req.query.selected;
            const image = await images.findOne({ FILENAME: selected + '.jpg' });
            if (image) {
                const { DESCRIPTION, PRICE } = image;
                res.render('purchase', { selected, description: DESCRIPTION, price: PRICE });
            } else {
                res.status(404).send("Image not found");
            }
        } catch (error) {
            console.error(error);
            res.status(500).send("Internal server error");
        }
    })

    router.post("/", async function (req, res) {
        if (!req.GallerySession.loggedIn) {
            res.redirect('/');
            return;
          }
        try {
            const selection = req.body.selected;

            await images.updateOne({ FILENAME: `${selection}.jpg` }, { $set: { STATUS: "S" } });
            res.redirect("/gallery");
        } catch (error) {
            console.error(error);
            res.status(500).send("Internal server error");
        }
    })

    return router;
}