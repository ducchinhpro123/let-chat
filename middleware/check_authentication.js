import jwt from 'jsonwebtoken';

/* Middleware to check if a user is already logged in */
export function checkAuthentication(req, res, next) {
  const token = req.cookies.jwt;
  // Have no token (No logged yet)
  if (!token) {
    return next();
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    // If authenticated user try to access these paths. Redirect to home page
    if (req.path === '/login' || req.path === '/register') {
      return res.redirect('/');
    }
    return next();

  } catch (e) {
    res.clearCookie('jwt');
    return next();
  }
}

