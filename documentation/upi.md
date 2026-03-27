dynamic QR codes per order are the best way to reduce fraud when using the UPI QR + manual transaction ID method. The idea is simple: every order generates a unique QR code containing the order ID, so the payment note always links to that order.
How Dynamic UPI QR Works
For every order you generate a unique UPI payment link like this:
Copy code

upi://pay?pa=restaurant@upi&pn=FoodHub&am=350&cu=INR&tn=ORDER_1025
Meaning:
Parameter
Purpose
pa
Your UPI ID
pn
Restaurant name
am
Order amount
cu
Currency
tn
Order ID (important for fraud prevention)
If the order is #1025, the QR will contain ORDER_1025.
When the customer pays via Google Pay, PhonePe, or Paytm, the note automatically becomes:
Copy code

ORDER_1025
So when you verify payments, you can match them to the correct order.
Example Flow
1️⃣ Customer places order
Database entry:
Order ID
Amount
Status
1025
₹350
Pending Payment
2️⃣ Generate QR for that order
Copy code

upi://pay?pa=restaurant@upi&pn=FoodHub&am=350&cu=INR&tn=ORDER_1025
Convert to QR.
3️⃣ Customer scans and pays
UPI app shows:
Copy code

Pay ₹350 to FoodHub
Note: ORDER_1025
4️⃣ Customer enters UTR
Form:
Copy code

UPI Transaction ID: __________
5️⃣ Admin verifies
Admin panel shows:
Order
Amount
UTR
Note
1025
₹350
42153128123
ORDER_1025
Admin clicks Verify Payment.
Order becomes Confirmed.
Why This Reduces Fraud
Without order ID:
User could send ₹1
Claim payment for ₹350 order
With order ID:
✔ Payment contains ORDER_1025
✔ Amount must match
✔ Easy verification
Simple React Example for Dynamic QR
JavaScript
Copy code
import QRCode from "react-qr-code";

const orderId = "ORDER_1025";
const amount = 350;

const upiLink = `upi://pay?pa=restaurant@upi&pn=FoodHub&am=${amount}&cu=INR&tn=${orderId}`;

<QRCode value={upiLink} size={220} />
Pro Tip (Used by Real Apps)
Add expiry to QR codes.
Example:
QR valid for 5 minutes
If timer expires → regenerate new QR.
This prevents users from reusing old payment links.