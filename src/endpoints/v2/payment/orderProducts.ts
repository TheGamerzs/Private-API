import { RouteGenericInterface, RouteHandlerMethod } from "fastify/types/route";
import { IncomingMessage, Server, ServerResponse } from "http";
import { pmdDB } from "../../../db/client";
import { nodemailer } from "nodemailer";
import Axios from "axios";

//* Define orders collection
let orders = pmdDB.collection("merchOrder");
let orderProducts = pmdDB.collection("merchProductOrders");

var transport = nodemailer.createTransport({
	host: process.env.EmailURL,
	port: process.env.EmailPort,
	auth: {
		user: process.env.EmailUser,
		pass: process.env.EmailPass
	}
});

//* Request Handler
const handler: RouteHandlerMethod<
	Server,
	IncomingMessage,
	ServerResponse,
	RouteGenericInterface,
	unknown
> = async (req, res) => {
	if (!req.params["transaction_id"]) return res.status(404);

	let order = await orders.findOne({
		"paid.transaction_id": req.params["transaction_id"]
	});

	if (!order || order.paid.transaction_time === "") return res.status(404);
	let userItems = [];
	await orderProducts
		.find({ order_id: order.order_id })
		.toArray()
		.then((products) => {
			products.forEach((product) => {
				userItems.push(product["product_id"] + "-" + product["quantity"]);
			});
		})
		.catch((err) => console.error("Failed to find products"));

	let itemQuantity = [];
	userItems.forEach((product) => {
		let item = {
			variant_id: product.split("-")[0],
			quantity: product.split("-")[1]
		};
		itemQuantity.push(item);
	});
	res.send(itemQuantity);

	/*Axios.post("https://api.printful.com/orders", {
		headers: { Authorization: "Basic " + process.env.Printful_API },
		data: {
			recipient: {
				name: order.shipping.firstName + " " + order.shipping.lastName,
				address1: order.shipping.streetAddress,
				city: order.shipping.locality,
				state_code: order.shipping.state || null,
				country_code: order.shipping.countryCodeAlpha2,
				zip: order.shipping.postalCode
			},
			items: itemQuantity
		}
	})
		.then((result) => {
			//Send confirmation email
			res.send(result);
		})
		.catch((err) => {
			res.send(err);
		});

	res.send(order);*/

	var mailOptions = {
		from: '"PreMiD Merchandise" <sales@premid.app>',
		to: order.billing.email || order.shipping.email,
		subject: "Merch Order Confirmation",
		html: `<b>Hey there! </b><br> This is our first message sent with Nodemailer<br />`
	};

	transport.sendMail(mailOptions, (error, info) => {
		if (error) {
			return console.log(error);
		}
		console.log(`Message sent: ${info.messageId}`);
	});
};

//* Export handler
export { handler };
