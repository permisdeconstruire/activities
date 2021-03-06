const url = require('url');
const querystring = require('querystring');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const router = require('express').Router();
const activities = require('./activities');
const forms = require('./forms');
const users = require('./users');
const pedagogy = require('./pedagogy');
const parcours = require('./parcours');
const promotions = require('./promotions');
const events = require('./events');
const roles = require('../utils/roles');

const tokenOptions = {};
tokenOptions.issuer = process.env.JWT_ISSUER;
tokenOptions.audience = process.env.JWT_AUDIENCE;
tokenOptions.expiresIn = process.env.JWT_TTL;

router.get('/callback', (req, res, next) => {
  const returnTo = req.session.returnTo
    ? req.session.returnTo
    : process.env.DEFAULT_RETURNTO;
  passport.authenticate('auth0', (err, user) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.redirect('/v0/login');
    }
    return req.logIn(user, err2 => {
      if (err2) {
        return next(err2);
      }
      return res.redirect(
        `${returnTo}?token=${encodeURIComponent(
          jwt.sign(user, process.env.JWT_SECRET, tokenOptions),
        )}`,
      );
    });
  })(req, res, next);
});

function saveOrigin(req, res, next) {
  const allowedReturns = process.env.ALLOW_RETURNTO.split(',');
  req.session.returnTo = process.env.DEFAULT_RETURNTO;

  if (typeof req.header('Referer') !== 'undefined') {
    const isAllowed = allowedReturns.find(a =>
      req.header('Referer').startsWith(a),
    );
    if (typeof isAllowed !== 'undefined') {
      req.session.returnTo = req.header('Referer');
    }
  }
  next();
}

router.all('/undefined', (req, res) => {
  res.type('text/html');
  res.status(200);
  res.send('<script>window.history.go(-4);</script>');
});

router.get(
  '/login',
  saveOrigin,
  passport.authenticate('auth0', { scope: 'openid email profile' }),
);

router.get('/logout', (req, res) => {
  req.logout();

  const allowedReturns = process.env.ALLOW_RETURNTO.split(',');
  let returnTo = process.env.DEFAULT_RETURNTO;

  if (typeof req.header('Referer') !== 'undefined') {
    const isAllowed = allowedReturns.find(a =>
      req.header('Referer').startsWith(a),
    );
    if (typeof isAllowed !== 'undefined') {
      returnTo = req
        .header('Referer')
        .replace('logout', '')
        .replace('verifier-mail', '');
    }
  }

  const logoutURL = new url.URL(
    `https://${process.env.AUTH0_DOMAIN}/v2/logout`,
  );
  const searchString = querystring.stringify({
    client_id: process.env.AUTH0_CLIENTID,
    returnTo,
  });
  logoutURL.search = searchString;

  res.redirect(logoutURL);
});

router.all(
  '/pilote/*',
  passport.authenticate('jwt', { session: false }),
  roles.isPilote,
);

router.all(
  '/admin/*',
  passport.authenticate('jwt', { session: false }),
  roles.isAdmin,
);

router.all(
  '/cooperator/*',
  passport.authenticate('jwt', { session: false }),
  roles.isCooperator,
);

router.get(
  '/whoami',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    res.json(req.user);
  },
);

router.get(
  '/admin/options',
  passport.authenticate('jwt', { session: false }),
  roles.isAdmin,
  (req, res) => {
    res.json({
      kibana: process.env.PDC_KIBANA_DASHBOARD_LINK,
    });
  },
);

router.get('/status', (req, res) => {
  res.json({ message: 'API OK' });
});

router.get('/cooperators', roles.listCooperators);

activities.create(router);
forms.create(router);
users.create(router);
pedagogy.create(router);
parcours.create(router);
promotions.create(router);
events.create(router);

module.exports = router;
