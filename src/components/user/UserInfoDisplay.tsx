import React from "react";
import { UserProfile } from "../../types";
import { formatDate } from "../../lib/utils";
import DateOfBirthInput from "../ui/DateOfBirthInput";
import Badge from "../ui/Badge";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserCircle } from "@fortawesome/free-solid-svg-icons";

interface UserInfoDisplayProps {
  profile: UserProfile;
  isadmin: boolean
}

const InfoItem: React.FC<{
  label: string;
  value: React.ReactNode;
  title?: string;
}> = ({ label, value, title }) => (
  <div title={title} className="truncate">
    <dt className="text-sm font-medium text-text-secondary">{label}</dt>
    <dd className="mt-1 text-sm text-text-primary truncate">
      {value || "N/A"}
    </dd>
  </div>
);

const UserInfoDisplay: React.FC<UserInfoDisplayProps> = ({ profile, isadmin }) => {


  return (
    <div className="bg-dark-secondary p-6 rounded-lg shadow-md border border-dark-tertiary">
      {/* Section Title with Icon */}
      <h2 className="text-lg font-semibold text-text-primary mb-4 border-b border-dark-tertiary pb-2 flex items-center">
        <FontAwesomeIcon
          icon={faUserCircle}
          className="mr-2 text-golden-accent flex-shrink-0"
        />
        Account Information
      </h2>
      {/* Definition List for key-value pairs */}
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
        <InfoItem
          label={isadmin ? "LoginId" : "Phone Number"}
          value={isadmin ? profile.loginId : profile.phone}
          title={isadmin ? profile.loginId : profile.phone}
        />
        <InfoItem label="Assigned Role" value={profile.role} />

        {!isadmin &&
          <InfoItem
            label="Account Verified"
            value={
              <Badge
                status={profile.isVerified ? "active" : "inactive"}
                size="sm"
              />
            }
          />
        }
        <InfoItem label="Registered On" value={formatDate(profile.createdAt)} />



        {profile.role !== "User" && (
          <InfoItem
            label="Telegram Linked"
            value={
              profile.telegramIdLinked ? (
                <>
                  <Badge status="active" size="sm" />
                  <span className="ml-2 text-text-secondary text-xs">
                    {profile.telegram_username}
                  </span>
                </>
              ) : profile.telegram_username ? (
                <>
                  <Badge status="pending" size="sm" />
                  <span className="ml-2 text-text-secondary text-xs">
                    {profile.telegram_username} (Pending)
                  </span>
                </>
              ) : (
                <Badge status="inactive" size="sm" />
              )
            }
          />
        )}
        {profile.name && <InfoItem label="Name" value={profile.name} />}

      </dl>
    </div>
  );
};

export default UserInfoDisplay;
