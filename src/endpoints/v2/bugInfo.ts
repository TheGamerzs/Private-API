import { RequestHandler } from "express";
import { pmdDB } from "../../db/client";

//* Define credits collection
const bug = pmdDB.collection("bugs");


//* Request Handler
const handler: RequestHandler = async (req, res) => {
	//* userId not providen
	if (!req.params["userId"]) {
		//* send error
		//* return
		res.send({ error: 1, message: "No userId providen." });
		return;
	}

	//* find user
    //* Return found bugs
    let result = await bug.find({userId: req.params["userId"], status: 'New'}, { projection: { _id: false }}).toArray();
	res.send(result);
};

//* Export handler
export { handler };