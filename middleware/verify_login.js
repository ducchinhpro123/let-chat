import jwt from 'jsonwebtoken';

export function verifyLogin(req, res, next) {
  if (!req.cookies) {
    return res.render('authentication_form', { message: 'You have to login first' });
  }

  const token = req.cookies.jwt;
  if (!token) {
    req.flash('loginRequired', 'Please login');
    return res.redirect('/users/authentication');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      maxAge: '1h',
    });
    const tokenExp = decoded.exp * 1000;
    const fiveMinutes = 5 * 60 * 1000;
    if (tokenExp - Date.now() < fiveMinutes) {
      const newToken = jwt.sign(
        { user_id: decoded.user_id, username: decoded.username },
        process.env.JWT_SECRET,
        { 'expiresIn': '1h' },
      );
      res.cookie('jwt', newToken, {
        httpOnly: true,
        maxAge: 3600000,
        sameSite: 'strict',
      });
    }
    req.user = {
      id: decoded.user_id,
      username: decoded.username,
    };
    return next();

  } catch (e) {
    console.error(e);
    res.clearCookie('jwt');
    return res.render('authentication_form', { 
      message: 'Cookies is wrong' 
    });
  }
}
