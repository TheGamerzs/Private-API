import { cache } from "../../index";
import { RequestHandler } from "express";

let presenceInfo = cache.get("presenceInfo");

cache.on("update", (_, data) => (presenceInfo = data), {
	only: "presenceInfo",
});

//* Request Handler
const handler: RequestHandler = async (req, res) => {
	if (!req.params["presence"]) return res.sendStatus(404);

	return res.send(
		presenceInfo.filter((document) => document.name === req.params["presence"])
	);
};

export { handler };
