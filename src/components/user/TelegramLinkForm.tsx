import React, { useState, useEffect, useRef } from "react";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import ErrorMessage from "../../components/ui/ErrorMessage";
import Badge from "../../components/ui/Badge";
import { TelegramFormData, UserProfile } from "../../types";
import { isValidTelegramUsername } from "../../lib/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTelegram } from "@fortawesome/free-brands-svg-icons";
import {
  faCheckCircle,
  faTimesCircle,
  faQuestionCircle,
} from "@fortawesome/free-solid-svg-icons";

interface TelegramLinkFormProps {
  currentUsername: string | null;
  onSubmit: (data: TelegramFormData) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  profile: UserProfile;
}

const TelegramLinkForm: React.FC<TelegramLinkFormProps> = ({
  currentUsername,
  onSubmit,
  isLoading,
  error: submissionError,
  profile,
}) => {
  const [username, setUsername] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setUsername(currentUsername || "");
    setValidationError(null);
  }, [currentUsername]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!username.trim()) {
      setValidationError("Telegram username cannot be empty.");
      return;
    }
    if (!isValidTelegramUsername(username.trim())) {
      setValidationError(
        "Invalid format. Use @username (5-32 letters, numbers)."
      );
      return;
    }
    console.log(username);

    onSubmit({ telegram_username: username.trim() });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    if (validationError) {
      setValidationError(null);
    }
  };

  const handleBlur = () => {
    if (username.trim() && !isValidTelegramUsername(username.trim())) {
      setValidationError(
        "Invalid format. Use @username (5-32 letters, numbers)."
      );
    } else {
      setValidationError(null);
    }
  };

  const telegramStatus = profile.telegramIdLinked
    ? "linked"
    : profile.telegram_username
      ? "pending"
      : "not_linked";

  const statusBadge = {
    linked: (
      <Badge status="active" size="sm" className="ml-2">
        Linked
      </Badge>
    ),
    pending: (
      <Badge status="pending" size="sm" className="ml-2">
        Pending
      </Badge>
    ),
    not_linked: (
      <Badge status="inactive" size="sm" className="ml-2">
        Not Linked
      </Badge>
    ),
  }[telegramStatus];

  const statusText = {
    linked: (
      <span className="text-functional-success font-medium ml-1">
        {currentUsername}
      </span>
    ),
    pending: (
      <span className="text-functional-warning font-medium ml-1">
        {currentUsername} (Confirmation Needed)
      </span>
    ),
    not_linked: (
      <span className="text-text-secondary ml-1">
        Your Telegram account is not linked.
      </span>
    ),
  }[telegramStatus];

  return (
    <div className="bg-dark-secondary p-6 rounded-lg shadow-md border border-dark-tertiary">
      {/* Section Title with Icon */}
      <h2 className="text-lg font-semibold text-text-primary mb-4 border-b border-dark-tertiary pb-2 flex items-center">
        <FontAwesomeIcon
          icon={faTelegram}
          className="mr-2 text-functional-info flex-shrink-0"
        />{" "}
        {/* Telegram icon */}
        Telegram Account
      </h2>
      {/* Display current status */}
      <div className="text-sm text-text-secondary mb-4 flex items-center">
        Status: {statusBadge} {statusText}
      </div>
      {/* Input field for Telegram Username */}
      <Input
        label={
          currentUsername
            ? "Telegram Username"
            : "Link Telegram Username"
        }
        id="telegram_username"
        name="telegram_username"
        value={username}
        onChange={handleInputChange}
        onBlur={handleBlur}
        placeholder="@your_telegram_username"
        disabled={isLoading || telegramStatus === "linked"}
        required
        error={validationError}
      />
      {submissionError && (
        <ErrorMessage message={submissionError} className="mt-4" />
      )}
      {/* Submit Button */}
      <Button
        type="submit"
        isLoading={isLoading}
        onClick={handleSubmit}
        disabled={
          isLoading ||
          !username.trim() ||
          !!validationError ||
          (profile.telegramIdLinked &&
            username.trim() === currentUsername?.trim())
        }
        variant="primary"
        className={`w-full sm:w-auto max-w-[200px] ${telegramStatus === "linked" ? "hidden" : ""}`}
        size="md"
      >
        {currentUsername ? "Update Username" : "Link Telegram Account"}
      </Button>
    </div>
  );
};

export default TelegramLinkForm;
