// Let's get permission!
window.addEventListerner("DOMContentLoaded", async() => {
  const { paymentManager } = await navigator.serviceWorker.register('/sw.js');
  if (!paymentManager) {
    return; // not supported, so bail out.
  }
  const state = await navigator.permissions.query({ name: "paymenthandler" })
  switch (state) {
    case "denied":
      return;
    case "prompt":
      const result = await paymentManager.register();
      if (result === "denied") {
        return;
      }
      break;
  }
  // Excellent, we got it! Let's now set up the user's cards.
  await methodRegistration(paymentManager);
}, { once: true });

function methodRegistration({ methods }) {
  // Multiple icons in a single bundle
  const visaIcons = {
    src: "/images/visa.ico",
    sizes: "16x16 32x32 64x64 150x200",
    type: "image/vnd.microsoft.icon",
  };
  // These would normally come out of a database
  const promisesToAdd = [
    methods.set("visa-4756", {
      name: "Visa ending ****4756",
      methods: ["basic-card"],
      icons: [visaIcons],
    }),
    methods.set("visa-6789", {
      name: "Visa ending ***6789",
      methods: ["basic-card"],
      icons: [visaIcons],
    }),
    methods.set("bobpay", {
      name: "My Bob Pay Account: john@example.com",
      methods: ["https://bobpay.com/"],
      image: "/images/bobpay_large.png",
      icons: [
        { src: "/images/bob_16.png", sizes: "16x16" },
        { src: "/images/bob_32.png", sizes: "32x32" },
        { src: "/images/bob_64.png", sizes: "64x64" },
      ],
    }),
  ];
  return Promise.all(promisesToAdd);
};
