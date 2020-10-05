let promoArgs = [];
let totalPrice = 0;
let temp = {
	products: 0,
	fees: {
		shipping: 0,
		billing: 0
	},
	promo: "",
	total: 0
};

export function promotionUpdatePrice(promotion: { type: "" }, order = temp) {
	if (promotion.type != order.promo) return 0;
	promoArgs = promotion.type.split("-");

	totalPrice = order.products;
	totalPrice += order.fees.shipping;
	totalPrice += order.fees.billing;

	//Percentage off
	if (promoArgs[0] === "p") {
		//Take from total
		if (promoArgs[1] === "a")
			return (totalPrice -= order.total * (promoArgs[2] / 100));
		//Take from products
		else if (promoArgs[1] === "p")
			return (totalPrice -= order.products * (promoArgs[2] / 100));
		//Take from fees
		else if (promoArgs[1] === "f") {
			//Take from shipping fee
			if (promoArgs[2] === "s")
				return (totalPrice -= order.fees.shipping * (promoArgs[3] / 100));
			//Take from billing fee
			else if (promoArgs[2] === "b")
				return (totalPrice -= order.fees.billing * (promoArgs[3] / 100));
		}
	}

	if (promoArgs[0] === "m") {
		//Take from total
		if (promoArgs[1] === "a") return (totalPrice -= promoArgs[2] / 100);
		//Take from products
		else if (promoArgs[1] === "p")
			return (totalPrice -= order.products - promoArgs[2] / 100);
		//Take from fees
		else if (promoArgs[1] === "f") {
			//Take from shipping fee
			if (promoArgs[2] === "s")
				return (totalPrice -= order.fees.shipping - promoArgs[3] / 100);
			//Take from billing fee
			else if (promoArgs[2] === "b")
				return (totalPrice -= order.fees.billing - promoArgs[3] / 100);
		}
	}

	return totalPrice;
}
