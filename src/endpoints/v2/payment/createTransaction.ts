import { RouteGenericInterface, RouteHandlerMethod } from "fastify/types/route";
import { IncomingMessage, Server, ServerResponse } from "http";
import { pmdDB } from "../../../db/client";
import { promotionUpdatePrice } from "../../../util/functions/formatPromotion";

let orderProducts = pmdDB.collection("merchProductOrders");
const promotions = pmdDB.collection("merchPromotion");
const orders = pmdDB.collection("merchOrder");
const merch = pmdDB.collection("merchProducts");
var braintree = require("braintree");

var gateway = new braintree.BraintreeGateway({
	environment: braintree.Environment.Sandbox,
	merchantId: process.env.BrainTree_Merchant_Id,
	publicKey: process.env.BrainTree_Public_Key,
	privateKey: process.env.BrainTree_Private_Key
});

let order = {
	order_id: 0,
	order_time: 0,
	price: {
		products: 0.0,
		fees: { shipping: 0.0, billing: 0.0 },
		promo: "",
		total: 0.0
	},
	paid: {
		transaction_id: "",
		transaction_time: "",
		paymentType: "",
		status: ""
	},
	shipping: {
		firstName: "",
		lastName: "",
		streetAddress: "",
		locality: "",
		postalCode: "",
		countryCodeAlpha2: ""
	}
};

async function priceCheck(request) {
	let validProductPrice = false;
	let validPromo = false;

	let totalPrice = 0;
	let totalProductPrices = 0;
	let productInfo;

	let promo;

	for (let i in request.products) {
		productInfo = await merch.findOne({
			item_id: request.products[i].split("-")[0]
		});
		totalProductPrices += productInfo.price;
	}

	if (totalProductPrices == request.price.total) validProductPrice = true;
	totalPrice = totalProductPrices;

	//Check if Promo is valid
	if (request.price.promo == "") validPromo = true;
	else {
		promo = await promotions.findOne({
			code: request.price.promo
		});

		if (promo) {
			if (promo.userId != null) {
				promo = await promotions.findOne({
					code: request.price.promo,
					userId: request.price.promo.split("-")[1]
				});
				if (
					(promo.useLimit > 0 || promo.useLimit == null) &&
					promo.expires > Date.now()
				) {
					validPromo = true;
				} else {
					validPromo = false;
				}
			} else if (
				(promo.useLimit > 0 || promo.useLimit == null) &&
				promo.expires > Date.now()
			) {
				validPromo = true;
			} else {
				validPromo = false;
			}
			totalPrice = promotionUpdatePrice(promo, request.price);
		} else {
			validPromo = false;
		}
	}

	if (totalProductPrices == request.price.products) {
		validProductPrice = true;
	}
	if (validProductPrice && validPromo && totalPrice == request.price.total)
		return true;
	else return false;
}

async function nextOrderID() {
	let count = 1;
	await orders.countDocuments({}).then((res) => {
		count = res + 1;
	});
	return count;
}

const handler: RouteHandlerMethod<
	Server,
	IncomingMessage,
	ServerResponse,
	RouteGenericInterface,
	unknown
> = async (req, res) => {
	if (!req.body["shipping"] || !req.body["products"][1] || !req.body["price"])
		return res.status(501);
	if (!(await priceCheck(req.body))) return res.status(500);

	let s = req.body["shipping"];
	if (
		!s["firstName"] ||
		!s["lastName"] ||
		!s["email"] ||
		!s["streetAddress"] ||
		!s["locality"] ||
		!s["postalCode"] ||
		!s["countryCodeAlpha2"]
	) {
		return res.status(401);
	}

	if (req.body["billing"]) {
		let b = req.body["billing"];
		if (
			b["firstName"] ||
			b["lastName"] ||
			b["email"] ||
			b["streetAddress"] ||
			b["locality"] ||
			b["postalCode"] ||
			b["countryCodeAlpha2"]
		) {
			order["billing"] = req.body["billing"];
		}
	}

	const order_id = await nextOrderID();
	order.order_id = order_id;
	order.order_time = new Date().getTime();
	order.price.products = req.body["price"].total;
	order.shipping = req.body["shipping"];

	let itemQuantity = [];

	for (let i in req.body["products"]) {
		let added = false;
		for await (let item of itemQuantity) {
			if (item.variant_id === req.body["products"][i].split("-")[2]) {
				added = true;
				item.quantity++;
			}
		}
		if (!added) {
			itemQuantity[i] = {
				order_id: order_id,
				variant_id: req.body["products"][i].split("-")[2],
				quantity: 1
			};
		}
	}

	await orders.insertOne(order).then(async (result) => {
		await orderProducts.insertMany(itemQuantity).then(async (result) => {
			await gateway.clientToken.generate({}, function (err, response) {
				if (response) return res.send(response.clientToken);
				else return res.send(err);
			});
		});
	});
	return res.status(500);
};

//* Export handler
export { handler };
