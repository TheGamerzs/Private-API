import { RequestHandler } from "express";
import { pmdDB } from "../../db/client";

//* Define credits collection
const langFiles = pmdDB.collection("langFiles");

//* Request Handler
const handler: RequestHandler = async (req, res) => {
  if (req.path.endsWith("/list")) {
    res.send(
      (await langFiles
        .find(
          { project: "extension" },
          { projection: { _id: false, lang: true } }
        )
        .toArray()).map(lF => lF.lang)
    );
    return;
  }

  if (!req.params["project"] || !req.params["lang"]) {
    res.sendStatus(404);
    return;
  }

  if (!["extension", "website"].includes(req.params["project"])) {
    res.send(404);
    return;
  }

  const langFile = await langFiles.findOne(
    {
      project: req.params["project"],
      lang: req.params["lang"]
    },
    { projection: { _id: false, translations: true } }
  );

  if (!langFile) {
    res.send({ error: 6, message: "No translations found." });
    return;
  }

  res.send(
    Object.assign(
      {},
      ...Object.keys(langFile.translations).map(translationKey => {
        const newKey = translationKey.replace(/[_]/g, ".");
        return {
          [newKey]: langFile.translations[translationKey]
        };
      })
    )
  );
};

//* Export handler
export { handler };

//? ["/v2/langFile/:project/:lang", "/v2/langFile/list"]