import { RouteGenericInterface, RouteHandlerMethod } from "fastify/types/route";
import { IncomingMessage, Server, ServerResponse } from "http";
import { getDiscordUser } from "../../../util/functions/getDiscordUser";
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
	if (!req.params["code"] && !req.params["token"]) return res.status(404);

	let promo;
	getDiscordUser(req.params["token"]).then(async (dUser) => {
		promo = await promotions.findOne({
			code: req.params["code"],
			userId: dUser.id
		});
	});
	if (
		(promo.useLimit > 0 || promo.useLimit == null) &&
		promo.expires > Date.now()
	) {
		return res.send(promo);
	} else if (promo.useLimit === 0) {
		return res.send({ string: "checkout.maximumUses" });
	} else if (promo.expires <= Date.now()) {
		return res.send({ string: "checkout.expiredCode" });
	}
};

//* Export handler
export { handler };
