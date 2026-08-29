MA SHAMSUNDARI ONLINE SERVICES - PREMIUM BILLING

1. Upload all files to the GitHub repository root.
2. Keep firebase-config.js in the same folder as index.html and app.js.
3. Firebase Authentication -> Sign-in method -> Email/Password -> Enable.
4. Firebase Authentication -> Users -> create the admin Email/Password user.
5. Firestore Database -> Rules -> paste firestore.rules and Publish.
6. GitHub Pages -> Settings -> Pages -> Deploy from branch -> main / (root) -> Save.
7. For local testing, use a local web server (not file://), for example VS Code Live Server.

IMPORTANT:
- The Firebase Web API key is included in firebase-config.js because it is a client-side Firebase web app configuration value. Do not put passwords in this file.
- Login requires an Email/Password user to exist in Firebase Authentication.
- Firestore saves bills only after a successful Firebase login.
- The UI is premium dark navy/gold, not the previous white/green design.
