import { cache } from "../../index";
import { RequestHandler } from "express";

let prsInfo = cache.get("presenceInfo");

cache.on("update", (_, data) => (prsInfo = data), {
	only: "presenceInfo",
});

//* Request Handler
const handler: RequestHandler = async (req, res) => {
	//* If presence not set
	if (!req.params["presence"]) return res.sendStatus(404);

	return res.send(
		prsInfo.filter((document) => document.name === req.params["presence"])
	);
};

export { handler };
