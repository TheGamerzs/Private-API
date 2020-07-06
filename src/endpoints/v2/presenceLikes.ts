import { getDiscordUser } from "../../util/functions/getDiscordUser";
import { RequestHandler } from "express";
import { pmdDB } from "../../db/client";

let presencesToUpdate = {};
const presenceInfo = pmdDB.collection("presenceInfo");

//* Request Handler
const handler: RequestHandler = async (req, res) => {
	if (!req.params["presence"] || !req.params["method"] || !req.params["token"])
		return res.sendStatus(404);

	await getDiscordUser(req.params.token)
		.then(async (dUser) => {
			if (presencesToUpdate[req.params["presence"]] == undefined)
				presencesToUpdate[req.params["presence"]] = {};

			if (
				presencesToUpdate[req.params["presence"]][req.params["method"]] ==
				undefined
			)
				presencesToUpdate[req.params["presence"]][req.params["method"]] = [];

			presencesToUpdate[req.params["presence"]][req.params["method"]].push(
				dUser.id
			);
			return res.sendStatus(200);
		})
		.catch((err) => {
			return res.send(err);
		});
};

export { handler };

function UpdateLikes() {
	Object.keys(presencesToUpdate).forEach(function (presence) {
		presencesToUpdate[presence].add.forEach((id) => {
			presenceInfo.update({ name: presence }, { $push: { likes: id } });
		});
		presencesToUpdate[presence].remove.forEach((id) => {
			presenceInfo.update({ name: presence }, { $pull: { likes: id } });
		});
	});
}

setTimeout(function () {
	UpdateLikes();
}, 300000);
