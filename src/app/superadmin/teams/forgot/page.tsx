// components/superadmin/forgotpassword.tsx

import React, { useState } from "react";
import Input from "../../../../components/ui/Input";
import Button from "../../../../components/ui/Button";
import ErrorMessage from "../../../../components/ui/ErrorMessage";
import { updateRoleUser } from "../../../../lib/apiClient";
import { getErrorMessage } from "../../../../lib/utils";
import { ROUTES } from "../../../../lib/constants";
import toast from "react-hot-toast";
import { useLocation, useNavigate } from "react-router-dom";


const SuperAdminForgotpassPage: React.FC = () => {
    const location = useLocation();
    const router = useNavigate()
    const searchParams = new URLSearchParams(location.search);
    const [loginId, setLoginId] = useState(searchParams.get("loginId"));
    const [password, setPassword] = useState("");

    const [isLoading, setIsLoading] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);


    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};
        if (!loginId.trim()) errors.loginId = "Login ID is required.";
        if (!password.trim()) errors.password = "Password is required.";

        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        if (!validateForm()) {
            console.log("Form validation failed.");
        }

        setIsLoading(true);
        const toastId = toast.loading(`Updating user ${loginId}...`);
        try {
            const payload: any = {
                loginId: loginId.trim(),
                password: password.trim(),
            };


            await updateRoleUser(payload);
            toast.success(
                `User '${loginId}' updated successfully.`,
                {
                    id: toastId,
                }
            );
            setLoginId("");
            setPassword("");
            setFormError(null);
            router(ROUTES.SUPER_ADMIN_TEAM)
        } catch (err) {
            const message = getErrorMessage(err);
            setFormError(message);
            toast.error(`Failed to update ${loginId} user: ${message}`, {
                id: toastId,
            });
        } finally {
            setIsLoading(false);
        }
    };




    return (
        <>
            <Button
                onClick={() => router(ROUTES.SUPER_ADMIN_TEAM)}
                variant="link"
                size="sm"
                className="mb-1 text-text-secondary hover:text-text-primary"
            >
                ← Back to Teams
            </Button>

            <form
                onSubmit={handleSubmit}
                className="p-8 rounded-lg bg-dark-secondary shadow-md border border-dark-tertiary space-y-6"
            >
                <h3 className="text-xl font-semibold text-text-primary border-b border-dark-tertiary pb-3">
                    Update System User
                </h3>

                {formError && (
                    <ErrorMessage
                        message={formError}
                        className="mb-4"
                        title="Submission Error"
                    />
                )}

                <div className="space-y-4">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Login ID"
                            id="loginId"
                            name="loginId"
                            value={loginId}
                            required
                            disabled={true}
                        />
                        <Input
                            label="New Password"
                            type="password"
                            id="password"
                            name="password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                            }}
                            required
                            disabled={isLoading}
                        />
                    </div>
                </div>


                <div className="flex justify-end pt-4">
                    <Button
                        type="submit"
                        isLoading={isLoading}
                        disabled={isLoading}
                        variant="primary"
                        className="sm:max-w-[200px]" // Restrain button width
                    >
                        Update User
                    </Button>
                </div>
            </form>
        </>
    );
};

export default SuperAdminForgotpassPage;
