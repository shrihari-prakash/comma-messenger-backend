console.log("Service Worker Loaded...");

self.addEventListener("push", e => {
  console.log("New Push Recieved...");
  console.log(e.data)
  const data = e.data.json();
  self.registration.showNotification(data.title, {
    body: data.description,
    icon: data.icon
  });
});