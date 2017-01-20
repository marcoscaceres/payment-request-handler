/* Handle payment request from a payee */
self.addEventListener("paymentrequest", ev => {
  ev.waitUntil(async ()=> {
    const { request } = ev.paymentRequ;
    const response = new PaymentResponse()
    const fetchRequest = new Request(self.location, { 
        method: "POST",  
        body: JSON.stringify(e.data),
    });
    const response = await fetch(request);
    const contentType = response.headers.get("content-type");
    if (!contentType) {
      throw new Error("No content type header");
    }
  });

    if(!contentType.includes("application/json")) {
      /* Respond to the payment request with the received body */
      
    } else if (contentType.indexOf("text/html") !== -1) { {
      /* Open a new payment window and populate it with the
         document returned from the response */
      var url = "data:text/html;base64," + btoa(body);
      clients.openWindow(url).then(function(windowClient) {
        windowClient.postMessage(e.data);
      });
    } else {
      throw new Error("Unexpected value in content type header");
    }
});

