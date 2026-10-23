// Affiche une paire de clés VAPID (`bun run vapid`). À copier dans le .env du serveur : la clé
// privée ne doit ni être committée ni être partagée.
import webpush from "web-push";

const { publicKey, privateKey } = webpush.generateVAPIDKeys();
console.log(`VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
