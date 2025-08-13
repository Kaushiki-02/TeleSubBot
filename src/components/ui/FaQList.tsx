

import { faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useState } from 'react';
const faqs = [
    {
        question: 'How much time will it take to join the group after payment?',
        answer:
            'Our system usually adds you instantly to the respective group. However, in rare cases, it may take up to 2 hours. If it takes longer, please contact support.',
    },
    {
        question: 'I have made the payment, but it is not reflecting?',
        answer:
            'Please reach out to our support team with a screenshot or transaction ID. We’ll resolve the issue as quickly as possible.',
    },
    {
        question: 'Can I choose which mobile number to use for joining the Telegram group post purchase?',
        answer:
            'Yes! You’ll receive a unique invite link. You can use any Telegram account to join, but note: each link works for one user only.',
    },
    {
        question: 'Is the group accessible on both mobile and desktop?',
        answer:
            'Absolutely. Telegram groups are synced across all your devices. You can access the group from mobile, desktop, or even web.',
    },
    {
        question: 'What if I accidentally leave the Telegram group?',
        answer:
            'You can use the original invite link to rejoin once, but if it’s expired or revoked, you’ll need to contact support.',
    },
    {
        question: 'Are payments refundable if I change my mind?',
        answer:
            'We offer refunds only in cases where access was never granted. Once you join the group, refunds are not applicable.',
    },
    {
        question: 'Can I share my invite link with a friend?',
        answer:
            'Yes. Each invite link is uniquely tied to your purchase and can only be used once. Sharing it will prevent you from joining.',
    },
];


export default function FaqSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const toggle = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <section className="max-w-3xl mx-auto px-4 py-10">
            <h2 className="text-3xl font-semibold text-text-primary mb-6">FAQs</h2>
            <div className="space-y-4">
                {faqs.map((faq, index) => {
                    const isOpen = openIndex === index;
                    return (
                        <div
                            key={index}
                            className="rounded-lg bg-dark-secondary border border-dark-border overflow-hidden transition-all duration-300"
                        >
                            <button
                                className="w-full flex justify-between items-center text-left px-4 py-3 text-color-text-primary focus:outline-none"
                                onClick={() => toggle(index)}
                            >
                                <span className="text-base">{faq.question}</span>
                                <FontAwesomeIcon
                                    icon={faChevronDown}
                                    className={`ml-2 text-sm transition-transform duration-200 ${isOpen ? 'rotate-180' : ''
                                        }`}
                                />
                            </button>
                            <div
                                className={`px-4 transition-all duration-300 ease-in-out ${isOpen ? 'max-h-40 opacity-100 py-2' : 'max-h-0 opacity-0 py-0'
                                    } overflow-hidden text-sm text-color-text-secondary`}
                            >
                                {faq.answer}
                            </div>
                        </div>
                    );
                })}
            </div>

        </section>
    );
}
