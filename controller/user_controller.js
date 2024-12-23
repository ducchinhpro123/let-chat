import { User } from '../models/user.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

class UserController {
  static async register(req, res) {
    return res.redirect('/users/authentication');
  }

  static async login(req, res) {
    return res.redirect('/users/authentication');
  }

  static async authentication(req, res) {
    const successMessage = req.flash('success')[0];
    const errorMessage = req.flash('error')[0];
    const loginRequired = req.flash('loginRequired')[0];

    return res.render('authentication_form', { 
      message: successMessage || errorMessage || loginRequired,
      success: !!successMessage,
    });

  }

  static async handleLogin(req, res) {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).render('authentication_form', {
        message: 'Username and password are required'
      });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).render('authentication_form', {
        message: 'Invalid credentials',
        oldInput: { username: req.body.username }
      });
    }

    await User.findOneAndUpdate(
      { _id: user._id },
      { status: 'online' }
    );

    const decodedPassword = await bcrypt.compare(password, user.password);
    if (!decodedPassword) {
        return res.status(401).render('authentication_form', { 
          message: 'Incorrect credentials', 
          oldInput: { username: req.body.username } 
        });
    }
    const payload = {
      user_id: user._id,
      username: user.username,
    };

    try {
      const token = jwt.sign(payload, process.env.JWT_SECRET, { 
        expiresIn: '1h',
        algorithm: 'HS256',
      });

      res.cookie('jwt', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 3600000,
      });

      res.cookie('wsToken', token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 3600000
      });

      return res.redirect('/');

    } catch (e) {
      console.error(e); 
      return res.status(500).render('authentication_form', {
        message: 'Internal Server Error'
      });
    }

  }

  static async logout(req, res) {
    try {
      const cookie = req.cookies.jwt;
      if (cookie) { res.clearCookie('jwt'); }

      req.flash('message', 'Successfully logged out');
      return res.redirect('/users/authentication');
    } catch (e) {
      console.log(e);
      req.flash('message', 'An error occur during logout');
      return res.redirect('/users/authentication');
    }
  }

  static async handleRegister(req, res) {
    const { username, password, confirmPassword } = req.body;

    if (!username || !password || !confirmPassword) {
      return res.status(400).render('authentication_form', { 
        message: 'Username and password are required' 
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).render('authentication_form', { 
        message: 'Password mismatch',
      });
    }

    const existingUser = await User.findOne({ 
      username: new RegExp(`^${username}$`, 'i') 
    });

    if (existingUser) {
      return res.status(409).render('authentication_form', { 
        message: 'Username is already taken', 
        oldInput: { username } 
      });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      username: username.toLowerCase(),
      password: hashedPassword,
      createdAt: new Date(),
    });

    try {
      await newUser.save();
      req.flash('success', 'Registration successful! Please log in');
      return res.redirect('/users/authentication');
    } catch (e) {
      if (e.name === 'ValidationError') {
        return res.status(400).render('register', { 
          message: 'Invalid input data', 
          oldInput: { username: req.body.username } 
        });
      }

      return res.status(500).render('register', { 
        message: 'Internal Server Error, please try again', 
        oldInput: { username: req.body.username } 
      });
    }
  }

}

export default UserController;
