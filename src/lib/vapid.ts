// VAPID public key is safe to expose to the browser — that's its purpose.
// The matching private key lives only in the send-push edge function env.
export const VAPID_PUBLIC_KEY =
  "BLiPnHm7y70VLTWFiOKrs3aNjQah2J3N3XBcupIU2QsJYkASBWkg5Ed65SHQUb6HfXgt1yoqTXyfD8lJ24jfEbU";

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}
