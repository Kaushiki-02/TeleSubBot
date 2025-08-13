import Button from '../ui/Button'; // Make sure to import Button component properly

const PlanCard = ({ plan, couponStatus, handleSubscribeClick, discountpercent }) => {

    return (
        <div
            key={plan._id}
            className="border border-dark-tertiary rounded-lg p-4 space-y-3 hover:border-golden-accent transition-colors"
        >
            <h3 className="text-lg font-semibold text-text-primary">{plan.name}</h3>

            {plan.markup_price != null && plan.markup_price > plan.discounted_price && (
                <span>
                    Price:{" "}
                    <span
                        className={`font-medium ${plan.discounted_price !== null || couponStatus === "valid"
                            ? "line-through text-text-disabled"
                            : "text-functional-success"
                            }`}
                    >
                        ₹{plan.markup_price}
                    </span>
                </span>
            )}

            {plan.discounted_price !== null && plan.discounted_price !== undefined && (couponStatus === "invalid" || couponStatus === null) && (
                <p className="text-xl font-bold text-functional-success">
                    ₹{plan.discounted_price}
                </p>
            )}

            {couponStatus === "valid" && plan.discounted_price === null && (
                <p className="text-xl font-bold text-functional-success">
                    ₹{plan.markup_price * (100 - discountpercent) / 100}
                </p>
            )}
            {couponStatus === "valid" && plan.discounted_price !== null && (
                <p className="text-xl font-bold text-functional-success">
                    ₹{plan.discounted_price * (100 - discountpercent) / 100}
                </p>
            )}
            <p className="text-sm text-text-secondary">{plan.validity_days} Days Validity</p>

            {plan.description && (
                <p className="text-xs text-text-secondary break-words whitespace-pre-line">
                    {plan.description}
                </p>
            )}

            <Button
                onClick={() => handleSubscribeClick(plan)}
                variant="primary"
                size="sm"
                className="w-full mt-4"
            >
                Subscribe
            </Button>
        </div>
    );
};

export default PlanCard;
