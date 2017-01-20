// Let's get permission!
window.addEventListerner("DOMContentLoaded", async () => {
  const { paymentAppManager } = await navigator.serviceWorker.register('/sw.js');
  if( !paymentAppManager ){
    return; // not supported, so bail out.
  }
  cont state = await navigator.permissions.query({ name: "paymenthandler" })
  switch (state) {
    case "denied":
      return;
    case "prompt":
      const result = await paymentAppManager.requestPermission();
      if (result === "denied") {
        return;
      }
      break;
  }
  // Excellent, we go it! Let's now set up the user's cards.
  await methodRegistration(paymentAppManager.methods);
}, { once: true });

async methodRegistration(methods) {
  // These would normally come out of a database
  const promisesToAdd = [
    methods.set("visa-4756", {
      name: "Visa ending ****4756",
      enabledMethods: ["basic-card"]
    }),
    methods.set("bobpay", {
      name: "My Bob Pay Account: john@example.com",
      enabledMethods: ["https://bobpay.com/"]
    }),
    methods.set("visa-4756", {
      name: "Visa ending ****4756",
      enabledMethods: ["basic-card"]
    }),
  ];
  await Promise.all(promisesToAdd);
};
