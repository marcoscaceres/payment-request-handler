addEventListener("canmakepayment", async ev => {
  const { paymentMethods } = registration.paymentManager;
  let canDoIt = true;
  // Query the user's payment methods, to see if we have the requested ones
  const loopUp = ev.methods.map(
    async key => ({ key, value: await paymentMethods.get(key) })
  );
  // Check that we support all the requested methods
  for await (const { key, value } of loopUp) {
    if (!value || !canProcessPaymentFor(key, value)) {
      canDoIt = false;
      break;
    }
  }
  ev.canMakePayment(canDoIt);
});
