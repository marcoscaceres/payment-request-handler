"use strict";
// User interface for payment flow - we could also pull this from Cache API
const paymentsUI = new URL("/pay-for-something", location).href;

// Fires when the merchant calls PaymentRequest.show()
addEventListener("paymentrequest", ev => {
  ev.respondWith(createResponseAndProcessPayment(ev));
});

// Attempt to process the request for payment
async function createResponseAndProcessPayment(ev) {
  const {request, paymentRequestID} = ev;
  const responseId = paymentRequestID || generateId();
  // Security check, but without leaking URL information to payment
  // processor.
  const isAllowed = await verifyDomain(ev.domain);
  if (!isAllowed) {
    console.error(`The domain ${ev.domain} is not allowed to request payment!`);
    const response = new sPaymentResponse(responseId);
    await response.complete("fail");
    return response;
  }
  // Gather email, name, phone, shipping address, etc. if requested
  const fields = {};
  if (request.requestedFields.length) {
    Object.assign(fields, await lookupUserInfo(request.requestedFields));
  }
  const creditCardDetails = await generateCreditCard();
  const init = Object.assign({}, {fields}, {details: creditCardDetails});
  // PaymentResponse can now be constructed and returned.
  const response = new PaymentResponse(responseId, "basic-card#visa", init);
  ev.waitUntil(coordiantePurchaseWithUser(ev, response));
  return response;
}

// Handle back and forth between end-user and merchant
async function coordiantePurchaseWithUser(ev, response) {
  const {request} = ev;
  // Handle the merchant calling PaymentRequest.abort()
  request.onabort = async() => {
    if (!client) {
      return;
    }
    // should call window.close();
    await promisedPostMessage(client, {action: "close"});
  };
  const client = await ev.openClientWindow(paymentsUI);
  // browser provided payment-flow window (overlay, sheet, whatever)
  const msg = {
    action: "showItems", // Let's see if the user wants to pay for these things
    displayItems: request.displayItems,
    total: request.total,
  };
  const result = await promisedPostMessage(client, msg);
  try {
    await coordiateCommuncations(result, response, client);
  } catch (err) {
    response.compete("fail");
  }
  // The payment flow ends once payment is compete
  const howDidItComplete = await response.isComplete;
  // Payment handlers can track if payments are succeeding per origin
  analytics(ev.origin, howDidItComplete);
  return;
}

async function coordiateCommuncations(result, response, client) {
  let msg;
  switch (result.action) {
  case "buy-it":
    break; // Awesome, we are done!
  case "updateShipping": {
    const merchantResult = await response.updateShippingAddress(result.newShippingAddress);
    if (merchantResult) {
      msg = Object.assign({action: "invalidShippingAddress"}, merchantResult);
    }
    break;
  }
  case "updateShippingOption": {
    const merchantResult = await response.updateShippingOption(result.newShippingOptionId);
    if (merchantResult) {
      msg = Object.assign({action: "invalidShippingOption"}, merchantResult);
    }
    break;
  }
  case "abort":
    throw new Error("User doesn't want this!");
  default:
    throw new Error("Unknown action");
  }
  if (msg) {
    // recursively repeat until the both parties and user says "buy-it".
    const endUserSays = await promisedPostMessage(client, msg);
    await coordiateCommuncations(endUserSays, response, client);
  }
}
