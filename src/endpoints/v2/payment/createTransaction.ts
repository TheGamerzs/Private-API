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

//Don't open
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
	printful: {
		order_id: "",
		created: "",
		updated: "",
		status: "",
		costs: {
			subtotal: "",
			discount: "",
			shipping: "",
			tax: "",
			total: ""
		}
	},
	shipping: {
		firstName: "",
		lastName: "",
		streetAddress: "",
		locality: "",
		postalCode: "",
		countryCodeAlpha2: ""
	},
	timeline: [
		{
			shipment: {
				id: 0,
				carrier: "",
				service: "",
				tracking_number: "",
				tracking_url: "",
				created: "",
				ship_date: "",
				shipped_at: 0,
				reshipment: false,
				items: [
					{
						item_id: 0,
						quantity: 0
					}
				]
			},
			order: {
				id: 0,
				external_id: "",
				store: 0,
				status: "",
				shipping: "",
				created: 0,
				updated: 0,
				recipient: "",
				name: "",
				company: "",
				address1: "",
				address2: "",
				city: "",
				state_code: "",
				state_name: "",
				country_code: "",
				country_name: "",
				zip: "",
				phone: "",
				email: "",
				items: [
					{
						id: 0,
						external_id: "",
						variant_id: 0,
						sync_variant_id: 0,
						external_variant_id: "",
						warehouse_product_variant_id: 0,
						quantity: 0,
						price: "",
						retail_price: "",
						name: "",
						product: {
							variant_id: 0,
							product_id: 0,
							image: "",
							name: ""
						},
						files: [
							{
								id: 0,
								type: "",
								hash: "",
								url: "",
								filename: "",
								mime_type: "",
								size: 0,
								width: 0,
								height: 0,
								dpi: 0,
								status: "",
								created: 0,
								thumbnail_url: "",
								preview_url: "",
								visible: true,
								options: [
									{
										id: 0,
										value: ""
									}
								]
							}
						],
						options: [
							{
								id: 0,
								value: 0
							}
						],
						sku: ""
					}
				],
				incomplete_items: [
					{
						name: "",
						quantity: 0,
						sync_variant_id: 0,
						external_variant_id: "",
						external_line_item_id: ""
					}
				],
				costs: {
					currency: "",
					subtotal: "",
					discount: "",
					shipping: "",
					digitization: "",
					tax: "",
					vat: "",
					total: ""
				},
				retail_costs: {
					currency: "",
					subtotal: "",
					discount: "",
					shipping: "",
					digitization: "",
					tax: "",
					vat: "",
					total: ""
				},
				pricing_breakdown: [],
				shipments: [
					{
						id: 0,
						carrier: "",
						service: "",
						tracking_number: "",
						tracking_url: "",
						created: 0,
						ship_date: "",
						shipped_at: 0,
						reshipment: false,
						items: [{ item_id: 0, quantity: 0 }]
					}
				],
				gift: {
					subject: "",
					message: ""
				},
				packing_slip: {
					email: "",
					phone: "",
					message: "",
					logo_url: ""
				}
			}
		}
	]
};
const RegExEmail = new RegExp(
	"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$"
);
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
	if (!RegExEmail.test(s["email"]))
		return res.send("Invalid shipping email format");

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
		if (!RegExEmail.test(b["email"]))
			return res.send("Invalid billing email format");
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
				product_id: req.body["products"][i].split("-")[0],
				colour: req.body["products"][i].split("-")[1],
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
