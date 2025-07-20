const express = require("express");
const multer = require("multer");
const AWS = require("aws-sdk");
const fs = require("fs");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(bodyParser.json());
app.use(express.static("public"));

AWS.config.update({ region: "us-east-2" });
const s3 = new AWS.S3();

//load existing pets data or if none, create empty array
let pets = [];
const petsFile = "./pets.json";
if (fs.existsSync(petsFile)) {
  pets = JSON.parse(fs.readFileSync(petsFile));
}

app.get("/pets", (req, res) => {
  res.json(pets);
});

app.post("/add-pet", upload.single("photo"), (req, res) => {
  const { name, age, breed } = req.body;
  const file = req.file;

  //upload image to s3
  const fileStream = fs.createReadStream(file.path);
  const uploadParams = {
    Bucket: "pet-post-images",
    Key: `${Date.now()}_${file.originalname}`,
    Body: fileStream
  };

  s3.upload(uploadParams, (err, data) => {
    if (err) {
      console.error("Upload error:", err);
      res.status(500).send("Error uploading image: " + JSON.stringify(err));
    } else {
      const pet = { name, age, breed, imageUrl: data.Location };
      pets.push(pet);
      fs.writeFileSync(petsFile, JSON.stringify(pets, null, 2));
      fs.unlinkSync(file.path);
      res.redirect("/");
    }
  });
});

app.listen(80, () => console.log("PetPost running on port 80"));
