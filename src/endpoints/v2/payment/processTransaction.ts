import { RouteGenericInterface, RouteHandlerMethod } from "fastify/types/route";
import { IncomingMessage, Server, ServerResponse } from "http";
import { pmdDB } from "../../../db/client";

let orders = pmdDB.collection("merchOrder");
var braintree = require("braintree");

var gateway = new braintree.BraintreeGateway({
	environment: braintree.Environment.Sandbox,
	merchantId: process.env.BrainTree_Merchant_Id,
	publicKey: process.env.BrainTree_Public_Key,
	privateKey: process.env.BrainTree_Private_Key
});

const handler: RouteHandlerMethod<
	Server,
	IncomingMessage,
	ServerResponse,
	RouteGenericInterface,
	unknown
> = async (req, res) => {
	if (
		!req.body["order_id"] &&
		!req.body["payment_method_nonce"] &&
		!req.body["device_data"]
	)
		return res.status(500);

	const order = await orders.findOne({
		order_id: req.body["order_id"]
	});
	if (order.paid.transaction_id !== "" || order.paid.transaction_time !== "")
		return res.status(500);

	gateway.transaction.sale(
		{
			amount: (order.price.total / 100).toFixed(2),
			paymentMethodNonce: req.body["payment_method_nonce"],
			//deviceData: req.body["device_data"],
			options: { submitForSettlement: true },
			billing: order.billing,
			shipping: order.shipping
		},
		function (err, result) {
			if (err) {
				console.error(err);
				return;
			}
			if (result.success) {
				orders.findOneAndUpdate(
					{
						order_id: req.body["order_id"]
					},
					{
						$set: {
							"paid.transaction_id": result.transaction.id,
							"paid.transaction_time": Date.parse(
								result.transaction.statusHistory[0].timestamp
							).toString(),
							"paid.paymentType": result.transaction.paymentInstrumentType,
							"paid.status": result.transaction.status
						}
					}
				);
				res.send({ transaction_Id: result.transaction.id });
			} else {
				res.send(result.message);
			}
		}
	);
};

//* Export handler
export { handler };
