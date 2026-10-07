export { deriveItemIdentity, generateMasterSecret } from "./identity";
// TODO(3.4): proveMembership({ identity, members, scope, message }) running in a Web Worker.
// TODO(4.2): encrypted vault (WebCrypto AES-GCM, PBKDF2-SHA256 600k) + backup phrase.
