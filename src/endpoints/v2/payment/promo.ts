import { RouteGenericInterface, RouteHandlerMethod } from "fastify/types/route";
import { IncomingMessage, Server, ServerResponse } from "http";
import { pmdDB } from "../../../db/client";

//* Define credits collection
const promotions = pmdDB.collection("merchPromotion");

//* Request Handler
const handler: RouteHandlerMethod<
	Server,
	IncomingMessage,
	ServerResponse,
	RouteGenericInterface,
	unknown
> = async (req, res) => {
	if (!req.params["code"]) return res.status(404);

	let promo;
	promo = await promotions.findOne({
		code: req.params["code"]
	});

	if (promo) {
		if (promo.userId != null) {
			return res.send({ string: "Promo is user owned" });
		} else if (
			(promo.useLimit > 0 || promo.useLimit == null) &&
			promo.expires > Date.now()
		) {
			return res.send(promo);
		} else if (promo.expires <= Date.now()) {
			return res.send({ string: "checkout.expiredCode" });
		} else if (promo.useLimit === 0) {
			return res.send({ string: "checkout.maximumUses" });
		} else {
			return res.send({ string: "checkout.invalidCode" });
		}
	} else {
		return res.send({ string: "checkout.invalidCode" });
	}
};

//* Export handler
export { handler };
