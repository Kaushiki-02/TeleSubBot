// components/admin/CreateRoleUserForm.tsx

import React, { useState, useEffect, useCallback } from "react";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Button from "../../components/ui/Button";
import ErrorMessage from "../../components/ui/ErrorMessage";
import { createRoleUser, getUsersList } from "../../lib/apiClient";
import { getErrorMessage } from "../../lib/utils";
import { UserProfile } from "../../types";
import { ROLES } from "../../lib/constants";
import toast from "react-hot-toast";

interface CreateRoleUserFormProps {
  onUserCreated: () => void;
}

const CreateRoleUserForm: React.FC<CreateRoleUserFormProps> = ({
  onUserCreated,
}) => {
  const [name, setName] = useState("");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<
    "Admin" | "Support" | "Sales" | ""
  >(ROLES.ADMIN);
  const [belongsToAdminId, setBelongsToAdminId] = useState<string>("");

  const [adminsList, setAdminsList] = useState<UserProfile[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const fetchAdmins = useCallback(async () => {
    if (selectedRole === ROLES.SUPPORT || selectedRole === ROLES.SALES) {
      setIsLoadingAdmins(true);
      try {
        const { users: adminUsers } = await getUsersList({
          role: ROLES.ADMIN,
          limit: 1000,
        });
        setAdminsList(adminUsers);
      } catch (err) {
        toast.error("Failed to load Admin list for assignment.");
        console.error("Error fetching admins:", getErrorMessage(err));
      } finally {
        setIsLoadingAdmins(false);
      }
    }
  }, [selectedRole]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = "Name is required.";
    if (!loginId.trim()) errors.loginId = "Login ID is required.";
    if (!password.trim()) errors.password = "Password is required.";
    if (!selectedRole) errors.selectedRole = "Role is required.";

    if (
      (selectedRole === ROLES.SUPPORT || selectedRole === ROLES.SALES) &&
      !belongsToAdminId
    ) {
      errors.belongsToAdminId = `Please select an Admin to link this user to.`;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setValidationErrors({});

    if (!validateForm()) {
      console.log("Form validation failed.");

      const firstErrorField = Object.keys(validationErrors)[0];
      if (firstErrorField) {
        document
          .getElementById(firstErrorField)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    setIsLoading(true);
    const toastId = toast.loading(`Creating ${selectedRole} user ${name}...`);
    try {
      const payload: any = {
        loginId: loginId.trim(),
        password: password.trim(),
        name: name.trim(),
        roleName: selectedRole,
      };
      if (selectedRole === ROLES.SUPPORT || selectedRole === ROLES.SALES) {
        payload.belongs_to = belongsToAdminId;
      }

      await createRoleUser(payload);
      toast.success(
        `${selectedRole} user '${name.trim()}' created successfully.`,
        {
          id: toastId,
        }
      );
      setName("");
      setLoginId("");
      setPassword("");
      setSelectedRole(ROLES.ADMIN);
      setBelongsToAdminId("");
      setValidationErrors({});
      setFormError(null);

      onUserCreated();
    } catch (err) {
      const message = getErrorMessage(err);
      setFormError(message);
      toast.error(`Failed to create ${selectedRole} user: ${message}`, {
        id: toastId,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const roleOptions = [
    { value: ROLES.ADMIN, label: "Admin" },
    { value: ROLES.SUPPORT, label: "Support" },
    { value: ROLES.SALES, label: "Sales" },
  ];

  const adminOptions = adminsList.map((admin) => ({
    value: admin._id,
    label: `${admin.name || "Unnamed Admin"} (${
      admin.loginId || admin.phone || "No ID"
    })`,
  }));

  const adminSelectOptions = [
    { value: "", label: "Select Admin...", disabled: true },
    ...adminOptions,
  ];

  const isAdminLinkRequired =
    selectedRole === ROLES.SUPPORT || selectedRole === ROLES.SALES;

  return (
    <form
      onSubmit={handleSubmit}
      className="p-8 rounded-lg bg-dark-secondary shadow-md border border-dark-tertiary space-y-6"
    >
      <h3 className="text-xl font-semibold text-text-primary border-b border-dark-tertiary pb-3">
        Create New System User
      </h3>

      {formError && (
        <ErrorMessage
          message={formError}
          className="mb-4"
          title="Submission Error"
        />
      )}

      <div className="space-y-4">
        <Input
          label="Name"
          id="userName"
          name="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setValidationErrors({ ...validationErrors, name: undefined });
          }}
          required
          disabled={isLoading}
          error={validationErrors.name}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Login ID"
            id="loginId"
            name="loginId"
            value={loginId}
            onChange={(e) => {
              setLoginId(e.target.value);
              setValidationErrors({ ...validationErrors, loginId: undefined });
            }}
            required
            disabled={isLoading}
            error={validationErrors.loginId}
          />
          <Input
            label="Password"
            type="password"
            id="password"
            name="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setValidationErrors({ ...validationErrors, password: undefined });
            }}
            required
            disabled={isLoading}
            error={validationErrors.password}
          />
        </div>
      </div>

      <fieldset className="pt-6 border-t border-dark-tertiary">
        <legend className="text-sm font-semibold text-text-secondary mb-4">
          Role Assignment
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Role"
            id="role"
            name="role"
            options={roleOptions}
            value={selectedRole}
            onChange={(e) => {
              setSelectedRole(e.target.value as typeof selectedRole);
              setValidationErrors({
                ...validationErrors,
                selectedRole: undefined,
                belongsToAdminId: undefined,
              });
            }}
            required
            disabled={isLoading}
            error={validationErrors.selectedRole}
          />
          {isAdminLinkRequired && (
            <Select
              label={`Link to Admin`}
              id="belongsToAdminId"
              name="belongsToAdminId"
              options={
                isLoadingAdmins
                  ? [{ value: "", label: "Loading Admins...", disabled: true }]
                  : adminSelectOptions
              }
              value={belongsToAdminId}
              onChange={(e) => {
                setBelongsToAdminId(e.target.value);
                setValidationErrors({
                  ...validationErrors,
                  belongsToAdminId: undefined,
                });
              }}
              required={isAdminLinkRequired}
              disabled={isLoading || isLoadingAdmins}
              isLoading={isLoadingAdmins}
              error={validationErrors.belongsToAdminId}
            />
          )}
        </div>
      </fieldset>

      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          isLoading={isLoading}
          disabled={isLoading}
          variant="primary"
          className="sm:max-w-[200px]" // Restrain button width
        >
          Create User
        </Button>
      </div>
    </form>
  );
};

export default CreateRoleUserForm;
