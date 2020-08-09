console.log("Service Worker Loaded...");

self.addEventListener("push", e => {
  console.log(e.data)
  const data = e.data.json();
  console.log("Push Recieved...");
  self.registration.showNotification(data.title, {
    body: data.description,
    icon: data.icon
  });
});