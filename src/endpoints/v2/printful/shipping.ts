import { RouteGenericInterface, RouteHandlerMethod } from 'fastify/types/route';
import { IncomingMessage, Server, ServerResponse } from 'http';
import axios from 'axios';
import { resolveSoa } from 'dns';

const handler: RouteHandlerMethod<
	Server,
	IncomingMessage,
	ServerResponse,
	RouteGenericInterface,
	unknown
> = async (req, res) => {
	if (!req.body['shipping'] || !req.body['products'][1]) return res.status(501);

	let products = [];
	for (let i in req.body['products']) {
		let added = false;
		for (let item of products) {
			if (item.variant_id === req.body['products'][i].split('-')[2]) {
				added = true;
				item.quantity++;
			}
		}
		if (!added) {
			products[i] = {
				quantity: 1,
				variant_id: req.body['products'][i].split('-')[2],
			};
		}
	}

	await axios
		.post(
			'https://api.printful.com/shipping/rates',
			{
				recipient: {
					address1: req.body['shipping']['address1'],
					address2: req.body['shipping']['address2'] || null,
					city: req.body['shipping']['city'],
					country_code: req.body['shipping']['country_code'],
					state_code: req.body['shipping']['state_code'] || null,
					zip: req.body['shipping']['zip'],
				},
				items: products,
			},
			{
				headers: {
					Authorization: 'Basic ' + process.env.Printful_API,
				},
			}
		)
		.then((response) => {
			res.send(response.data);
		})
		.catch((error) => {
			res.send(error);
		});
};

//* Export handler
export { handler };
