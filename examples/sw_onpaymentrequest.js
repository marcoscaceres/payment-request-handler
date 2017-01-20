// User interface for payment flow:
const paymentsUI = new URL("/pay-for-something", location).href;

// Fires when the merchant calls PaymentRequest.show()
addEventListener("paymentrequest", ev => {
  ev.waitUntil(async() => {
    const { request } = ev;
    // browser provided payment flow window
    const client;
    // Handle the merchant calling PaymentRequest.abort()
    ev.request.onabort = async(ev) => {
      if (!client) {
        return;
      }
      // should call window.close();
      await promisedPostMessage(client, { action: "close" });
    }
    // Security check, but without leaking URL information to payment
    // processor.
    const isAllowed = await verifyDomain(ev.domain);
    if (!isAllowed) {
      const msg = `The domain ${ev.domain} is not allowed to request payment!`;
      throw new DOMException(msg, "SecurityError");
    }
    const id = request.paymentRequestID || generateId();
    if (request.requestedFields.length) {
      // Gather email, name, phone, shipping address
      const fields = await lookupUserInfo(request.requestedFields);
    }
    const creditCardDetails = await generateCreditCard();
    const init = Object.assign({ fields }, { details: creditCardDetails });
    // PaymentResponse can now be constructed and returned.
    const response = new PaymentResponse(id, "basic-card#visa", init);
    ev.respondWith(response);
    try {
      client = await ev.openClientWindow(paymentsUI);
      const msg = {
        action: "showItems",
        displayItems: request.displayItems,
        total: request.total,
      };
      await coordiantePurchaseWithUser(client, response);
    } catch (err) {
      console.error(err);
      await response.complete("fail");
    }
    // The payment flow ends once payment is compete
    const howDidItComplete = await response.isComplete;
    // Payment handlers can track if payments are succeeding per origin
    analytics(ev.origin, howDidItComplete);
  });
});

async function coordiantePurchaseWithUser(client, response, msg) {
  const result = await promisedPostMessage(client, msg);
  switch (result.action) {
    case "updateShipping":
      const details = await response.updateShippingAddress(result.newShippingAddress);
      if (details) {
        // rinse and repeat until consensus is reached...
        const msg = Object.assign({ action: "invalidShippingAddress" }, details);
        await coordiantePurchaseWithUser(client, response, msg);
      }
      break;
    case "updateShippingOption":
      const details = await response.updateShippingOption(result.newShippingOptionId);
      if (details) {
        // rinse and repeat until consensus is reached...
        const msg = Object.assign({ action: "invalidShippingOption" }, details);
        await coordiantePurchaseWithUser(client, response, msg)
      }
      break;
    case "abort":
      throw new Error("User doesn't want this!");
    case "buy it":
      break;
    default:
      throw new Error("Unknown action");
  }
  return;
}

function promisedPostMessage(client, msg) {
  return new Promise(resolve => {
    const msgId = String(Math.random()).substr(2);
    const uniqueMsg = Object.assign({ msgId }, msg);
    client.addEventListener("message", function msgHandler({ data }) {
      if (data.msgId !== msgId) {
        return; // not for me!
      }
      client.removeEventListener("message", msgHandler);
      resolve(data);
    });
    client.postMessage(uniqueMsg);
  });
}
