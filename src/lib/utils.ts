// lib/utils.ts
import { format, parseISO, differenceInDays, formatDistanceToNowStrict } from 'date-fns';
import axios from 'axios'; // Import axios to use isAxiosError

export const formatDate = (dateString?: string | null, formatString = 'dd MMM yyyy'): string => {
    if (!dateString) return 'N/A';
    try {
        const date = parseISO(dateString);
        return format(date, formatString);
    } catch (error) {
        console.error("Error formatting date:", dateString, error);
        return 'Invalid Date';
    }
};

export const maskPhone = (phone?: string | null): string => {
    if (!phone || phone.length < 7) return phone || 'N/A'; // Need enough digits to mask
    const countryCodeMatch = phone.match(/^(\+\d{1,3})/);
    const countryCode = countryCodeMatch ? countryCodeMatch[1] : '';
    const numberPart = phone.substring(countryCode.length);
    if (numberPart.length <= 4) return phone; // Not enough digits to mask meaningfully
    const lastFour = numberPart.slice(-4);
    const maskedPart = '*'.repeat(numberPart.length - 4);
    return `${countryCode}${maskedPart}${lastFour}`;
};

export const getDaysRemaining = (endDateString?: string | null): number | null => {
    if (!endDateString) return null;
    try {
        const endDate = parseISO(endDateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today
        // Consider end date inclusive (valid until end of day)
        const endOfDayEndDate = new Date(endDate);
        endOfDayEndDate.setHours(23, 59, 59, 999);

        if (endOfDayEndDate < today) return 0; // Expired

        // Calculate difference in days
        return differenceInDays(endOfDayEndDate, today);
    } catch (error) {
         console.error("Error calculating days remaining:", endDateString, error);
        return null;
    }
};

export const formatRelativeDate = (dateString?: string | null): string => {
     if (!dateString) return 'N/A';
     try {
         const date = parseISO(dateString);
         return formatDistanceToNowStrict(date, { addSuffix: true });
     } catch (error) {
         console.error("Error formatting relative date:", dateString, error);
         return 'Invalid Date';
     }
};

// Basic E.164 format validation (very basic)
export const isValidE164 = (phone: string): boolean => {
  // Allows '+' followed by 1-3 digits country code, then 6-14 digits number part.
  // Adjust regex based on more specific needs if required.
  const e164Regex = /^\d{10}$/;
  return e164Regex.test(phone);
};


// Basic OTP validation
export const isValidOtp = (otp: string): boolean => {
  const otpRegex = /^\d{6}$/;
  return otpRegex.test(otp);
};

// Basic PAN validation (India)
export const isValidPAN = (pan: string): boolean => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan.toUpperCase());
};

// Basic Aadhaar validation (India)
export const isValidAadhaar = (aadhaar: string): boolean => {
    const aadhaarRegex = /^\d{12}$/;
    return aadhaarRegex.test(aadhaar);
};

// Basic Telegram Username validation
export const isValidTelegramUsername = (username: string): boolean => {
    // Starts with @, followed by 5-32 characters (letters, numbers, underscore)
    const usernameRegex = /^@[a-zA-Z0-9_]{5,32}$/;
    return usernameRegex.test(username);
}


// Add Razorpay Load Script function
export const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
         if (document.getElementById('razorpay-checkout-js')) {
            resolve(true); // Already loaded
            return;
        }
        const script = document.createElement('script');
        script.id = 'razorpay-checkout-js';
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => {
            console.error('Razorpay SDK failed to load.');
            resolve(false);
        };
        document.body.appendChild(script);
    });
};

// Helper to get error message from Axios error or other error types
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    // Check if the response data has a message property
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    // Otherwise, return the generic Axios error message
    return error.message;
  } else if (error instanceof Error) {
    // Standard JavaScript error
    return error.message;
  } else {
    // Other types of errors or non-errors thrown
    return 'An unknown or unexpected error occurred.';
  }
};
