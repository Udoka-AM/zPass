export { deriveItemIdentity, generateMasterSecret } from "./identity";
export {
  type Artifacts,
  checkProof,
  PROOF_DEPTH,
  type ProveArgs,
  proveMembership,
  type SemaphoreProof,
  scopeHash,
  WEB_ARTIFACTS,
} from "./proof";
// TODO(3.4): run proveMembership in a Web Worker for the web app.
// TODO(4.2): encrypted vault (WebCrypto AES-GCM, PBKDF2-SHA256 600k) + backup phrase.
