const express = require("express");
const bodyParser = require("body-parser");
const request = require("request");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const session = require("express-session");
const path = require('path');
const { json } = require("body-parser");
const { Router } = require("express");
const JWT_SECRET="randomsecret";
const jwt=require('jsonwebtoken')







studentSchema=new mongoose.Schema({
  username: String,
  email: String,
  age: Number,
  password: String
})




const Student=mongoose.model("student",studentSchema);





const route = express.Router();
route.use(cors());


route.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: true
}));


route.get("/login", async(req,res) => {
  res.render("login-signup");
})

route.post('/login', async (req, res) => {
    if (typeof req.body.username === 'undefined') {
        // Login
        const {
            email,
            password,
            loginOption
        } = req.body;
        if (loginOption == "student") {
            const student = await Student.find({ email });
            console.log(student);
            if (!student[0]) return res.status(400).send({
                message: "Invalid email"
            });
            const isPasswordValid = bcrypt.compareSync('' + password, '' + student[0].password);
            if (!isPasswordValid) return res.status(400).send({
                message: "Invalid email or password"
            });
            else {
                req.session.student = student[0];
                req.session.save();
                res.render("./success");
            }
        }
        

    } else {
        // Register
        const {
            username,
            email,
            password,
            loginOption
        } = req.body;
        const student = await Student.find({ email });
        if (typeof student[0] != 'undefined') {
            return res.status(400).send({
                message: "Email Id already in use by a student."
            });
        }


    

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: "r.patidar181001.2@gmail.com",
                pass: "lftnzmpgnyibshxl"
            }
        });
        console.log(otp);
        const hashedPassword = bcrypt.hashSync(password, 1);
        const mailOptions = {
            from: "sharmaaakash1920@gmail.com",
            to: email,
            subject: "OTP for login",
            text: `Your OTP is ${otp}`
        };
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error);
                res.status(500).send({
                    message: "Failed to send OTP"
                });
            } else {
                console.log("OTP sent: " + info.response);
                res.send({
                    message: "OTP sent"
                });
            }
        });
        req.session.username = username;
        req.session.save();
        req.session.email = email;
        req.session.save();
        req.session.hashedPassword = hashedPassword;
        req.session.save();
        req.session.loginOption = loginOption;
        req.session.save();
        req.session.otp = otp;
        req.session.save();
        res.redirect("/otp");
    }
});

route.get("/otp", async (req, res) => {
    const username = req.session.username;
    if (typeof username == "undefined") {
        return res.status(400).send(
            '<p>Please Login first</p><a href = "/">Login now</a>'
        );
    } else {
        res.render("otp")
    };
});


route.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/");
})


route.post("/otp", async (req, res) => {
    const {
        first, second, third, fourth, fifth, sixth
    } = req.body;
    const otpEntered = first + second + third + fourth + fifth + sixth;
    const otp = req.session.otp;
    const email = req.session.email;
    const username = req.session.username;
    const hashedPassword = req.session.hashedPassword;
    const loginOption = req.session.loginOption;

    if (loginOption == "student") {
        if (otp == otpEntered) {
            console.log("Idhar to hai");

            const newStudent = new Student({
                username,
                email,
                password: hashedPassword
            });
            // console.log("Idhar hai");
            // console.log(newStudent);
            await newStudent.save();
            req.session.student = newStudent;
            req.session.save();
            req.session.email = newStudent.email;
            req.session.save();
            res.redirect('/');
        } else {
            res.send({ Error: "Invalid OTP" });
        }
    }  else {
            res.send({ Error: "Invalid OTP" });
        }
    }
);




route.get('/forgot-password', (req,res) => {
  res.render("forgot-password");
})

route.post('/forgot-password', async(req,res) => {
  console.log(req.body);
  let email=req.body.email;
  let option=req.body.option;
  req.session.email=email;
  req.session.option=option;

  let found="";
  let link;
  //console.log("here");
  if(option=="s"){

    const student = await Student.findOne({email});
    if (!student) return res.status(400).send({
      message: "Invalid email"
    });
    req.session.id=student._id;
    const secret=JWT_SECRET + student.password;
    const payload= {
      email: student.email,
      id:student._id
    };
    const token = jwt.sign(payload, secret, {expiresIn:'15m'});
    link = `http://localhost:3000/reset-password/${student._id}/${token}`;
    //console.log(link);
    found="found";
    res.render("forgot-password-mail-sent");

  }
  if(found=="found"){
    const mailOptions = {
      from: "sharmaaakash1920@gmail.com",
      to: email,
      subject: "link for reset password",
      html: `<p>Reset you password using the link. It is only valid for 15 min.</p><a href=${link}>link</a>`
    };

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: "r.patidar181001.2@gmail.com",
            pass: "lftnzmpgnyibshxl"
        }
    });
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        res.status(500).send({
          message: "Failed to send link"
        });
      } else {
        console.log("sent sent sent")
        console.log("resetLink sent: " + info.response);
        res.send({
          message: "link resetlink"
        });
      }
    });
  }
})



route.get('/reset-password/:id/:token', async(req,res) => {
  // console.log(req.params);
  // console.log(req.session.option);
  const id=req.params.id;
  const option= req.session.option;
  const token=req.params.token;
  const link=`/reset-password/${id}/${token}`;

  if(option=='s'){

    const student = await Student.findOne({_id:id});
    if (!student) return res.status(400).send({
      message: "Invalid email"
    });
    // console.log(student);
    // console.log(student);
    const secret=JWT_SECRET + student.password;
    //console.log(secret);
    try{
      const payload = jwt.verify(token, secret);
      res.render("reset-password",{link:link});
    }catch(error){
      console.log(error);
      res.send(error);
    }



  } 

})

route.post('/reset-password/:id/:token', async(req,res) => {
  console.log("i m here")
  const id=req.params.id;
  const option= req.session.option;
  const token=req.params.token;
  const {password, repassword}=req.body;

  if(option=='s'){
    const student = await Student.findOne({_id:id});
    if (!student) return res.status(400).send({
      message: "Invalid email"
    });
    // console.log(student);
    // console.log(student);
    const secret=JWT_SECRET + student.password;
    //console.log(secret);
    try{
      const payload = jwt.verify(token, secret);
      if(password==repassword){
        console.log("matched");
        const hashedPassword = bcrypt.hashSync(password, 1);
        const student = await Student.updateOne({_id:id},{$set: {password:hashedPassword}})
        if (!student) return res.status(400).send({
          message: "Invalid email"
        });
      }
      res.render("reset-password-success");
    }catch(error){
      console.log(error);
      res.send(error);
    }



  } 


})
module.exports = route;
