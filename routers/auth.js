import express from "express";
import User from "../models/Users.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const routerAuth = express.Router();

routerAuth.get('/login', (req, res) => {
  res.clearCookie('token');
  res.render('login', { message: null ,  layout: false });
});

routerAuth.get('/register', (req, res) => {
  res.clearCookie('token');
  res.render('register', { message: null ,layout: false});
});

routerAuth.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.render('register', { message: 'Username already exists' ,layout: false});
    }

    const user = new User({ username, password });
    await user.save();

    res.render('login', { message: 'Registration successful! Please login.' ,layout: false});
  } catch (error) {
    console.error(error);
    res.render('register', { message: 'Error during registration',layout: false });
  }
});

routerAuth.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user || !(await user.comparePassword(password))) {
      return res.render('login', { message: 'Invalid username or password',layout: false });
    }

    const isAdmin = user.username === "admin";

    const token = jwt.sign(
      {username: user.username, id: user._id, role: isAdmin ? "admin" : "user" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', 
      maxAge: 60 * 60 * 1000
    });

    res.redirect(isAdmin  ? "/PC" : "/DKHN");
  } catch (error) {
    console.error(error);
    res.render('login', { message: 'Error during login' ,layout: false});
  }
});
routerAuth.get('/forgot', (req, res) => {
  res.render('forgot', { message: null ,layout: false});
});

routerAuth.post('/forgot', async (req, res) => {
  const { username, newPassword } = req.body;

  try {
    const user = await User.findOne({ username });

    if (!user) {
      return res.render('forgot', { message: "Không tìm thấy tên người dùng này." ,layout: false});
    }
    user.password = newPassword;
    await user.save();

    res.redirect('/login');
  } catch (error) {
    console.error("❌ Lỗi khi reset mật khẩu:", error);
    res.render('forgot', { message: "Lỗi hệ thống." ,layout: false});
  }
});

export default routerAuth;
