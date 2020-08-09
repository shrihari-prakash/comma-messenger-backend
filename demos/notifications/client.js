const publicVapidKey =
  "BONB3pqB9arGIu-fnJg05obAENIEGTRzD4ilK7egoTSI8UisiYvGDQkvcvRdASzwqWUKkCh7ijlmmF1D4v1LPok"; // Replace with your public key.

let token = prompt("Enter your API token:");

if (token == null || token == "") {
  alert("No valid auth token was provided.");
} else {
  // Check for service worker
  if ("serviceWorker" in navigator) {
    send().catch((err) => console.error(err));
  }

  // Register SW, Register Push, Send Push
  async function send() {
    // Register Service Worker
    console.log("Registering service worker...");
    const register = await navigator.serviceWorker.register(
      "./service_worker.js",
      {
        scope: "/",
      }
    );
    console.log("Service Worker Registered...");

    // Register Push
    console.log("Registering Push...");
    const subscription = await register.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
    });
    console.log("Push Registered...");

    // Send Push Notification
    console.log("Sending Push...");
    await fetch("http://localhost:26398/api/rest/v1/notifications/subscribe", {
      method: "POST",
      body: JSON.stringify(subscription),
      headers: {
        "content-type": "application/json",
        Authorization: "Bearer " + token,
      },
    });
    console.log("Push Sent...");
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
