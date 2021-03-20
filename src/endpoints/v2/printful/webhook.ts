import { RouteGenericInterface, RouteHandlerMethod } from 'fastify/types/route';
import { IncomingMessage, Server, ServerResponse } from 'http';
import { createHash } from 'crypto';

const handler: RouteHandlerMethod<
	Server,
	IncomingMessage,
	ServerResponse,
	RouteGenericInterface,
	unknown
> = async (req, res) => {
	let hash = {
		first: createHash('md5').update(req.params['first']).digest('hex'),
		second: createHash('md5').update(req.params['second']).digest('hex'),
		third: createHash('md5').update(req.params['third']).digest('hex'),
		fourth: createHash('md5').update(req.params['fourth']).digest('hex'),
	};

	if (
		!req.body['type'] ||
		!req.body['created'] ||
		!req.body['retries'] ||
		!req.body['data'] ||
		req.body['store'] != process.env.Printful_StoreID
	) {
		return res.status(500);
	}
};

//* Export handler
export { handler };
