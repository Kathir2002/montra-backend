import GoogleStrategyPassport from "passport-google-oauth2";
import passport from "passport";

const GoogleStrategy = GoogleStrategyPassport.Strategy;
passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((user: any, done) => {
  done(null, user);
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_SECRET as string,
      callbackURL: "https://montra-hero.onrender.com/api/auth/google/callback",
    },
    (accessToken: any, refreshToken: any, profile: any, done: any) => {
      //   const user = await User.findOne({ email: profile?._json?.email });
      //   // signup
      //   if (!user) {
      //     const newUser = new User({
      //       username: profile?._json?.name,
      //       email: profile?._json?.email,
      //       picture: profile?._json?.picture,
      //       savedCodes: [],
      //     });
      //     await newUser.save();
      //     done(null, newUser);
      //   } else {
      //     done(null, user);
      //   }
    }
  )
);
